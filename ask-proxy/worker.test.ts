// @vitest-environment node
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IP_DAILY_LIMIT_REACHED, MAX_QUESTION_LENGTH } from "./protocol";
import { createHandler, DEFAULT_DAILY_LIMIT, DEFAULT_IP_DAILY_LIMIT, Env } from "./worker";

const ORIGIN = "https://owner.github.io";

const textDelta = (text: string) => ({
  type: "content_block_delta",
  index: 0,
  delta: { type: "text_delta", text },
});

const stop = (stopReason: string) => ({
  type: "message_delta",
  delta: { stop_reason: stopReason, stop_sequence: null },
  usage: {},
});

// the client of the SDK, with a stream of the given events
const mockClient = (events: unknown[], { fail = false } = {}) => {
  const abort = vi.fn();
  const stream = vi.fn((params: unknown) => {
    void params;
    return {
      abort,
      done: async () => {},
      async *[Symbol.asyncIterator]() {
        yield* events;
        if (fail) throw new Error("overloaded");
      },
    };
  });
  const client = { beta: { messages: { stream } } } as unknown as Anthropic;
  return { client, stream, abort };
};

const mockEnv = ({
  allowed = true,
  used = 0,
  usedByIp = 0,
  origins = `https://other.example, ${ORIGIN}`,
  vars = {},
}: {
  allowed?: boolean;
  used?: number;
  usedByIp?: number;
  origins?: string;
  vars?: Partial<Env>;
} = {}) => {
  const store = new Map<string, string>([
    ["answers:2026-10-13", String(used)],
    ["answers:2026-10-13:1.2.3.4", String(usedByIp)],
  ]);
  return {
    ...vars,
    ANTHROPIC_API_KEY: "key",
    ALLOWED_ORIGINS: origins,
    RATE_LIMITER: { limit: vi.fn(async () => ({ success: allowed })) },
    BUDGET: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => void store.set(key, value)),
    },
  } satisfies Env;
};

const ask = (body: unknown, { origin = ORIGIN, method = "POST" } = {}) =>
  new Request("https://ask.example/", {
    method,
    headers: { ...(origin && { Origin: origin }), "CF-Connecting-IP": "1.2.3.4" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });

describe("ask proxy", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-13T12:00:00Z"), toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("streams the text of the answer to an allowed origin", async () => {
    const { client, stream } = mockClient([
      { type: "message_start" },
      { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "" } },
      textDelta("Four years "),
      textDelta("of React."),
      stop("end_turn"),
      { type: "message_stop" },
    ]);
    const env = mockEnv();

    const response = await createHandler(() => client)(
      ask({ question: "  How long with React?  ", language: "ru" }),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(await response.text()).toBe("Four years of React.");
    expect(env.RATE_LIMITER.limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
    expect(env.BUDGET.put).toHaveBeenCalledWith("answers:2026-10-13", "1", expect.anything());
    expect(env.BUDGET.put).toHaveBeenCalledWith(
      "answers:2026-10-13:1.2.3.4",
      "1",
      expect.anything(),
    );
    const params = stream.mock.calls[0][0] as Record<string, unknown>;
    expect(params.messages).toEqual([{ role: "user", content: "How long with React?" }]);
    expect(JSON.stringify(params.system)).toContain("Answer in Russian");
  });

  it("answers even when the counter can't be written", async () => {
    const { client } = mockClient([textDelta("Yes."), stop("end_turn")]);
    const env = mockEnv();
    env.BUDGET.put.mockRejectedValue(new Error("429 Too Many Requests"));
    const response = await createHandler(() => client)(
      ask({ question: "hi", language: "eng" }),
      env,
    );
    expect(await response.text()).toBe("Yes.");
  });

  it("answers the preflight of an allowed origin only", async () => {
    const handler = createHandler(() => mockClient([]).client);
    const preflight = await handler(ask(null, { method: "OPTIONS" }), mockEnv());
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toBe("POST");

    const foreign = await handler(
      ask({ question: "hi", language: "eng" }, { origin: "https://evil.example" }),
      mockEnv(),
    );
    expect(foreign.status).toBe(403);
    expect(foreign.headers.get("Access-Control-Allow-Origin")).toBeNull();

    // a stray comma in the list doesn't let requests without an Origin through
    const noOrigin = await handler(
      ask({ question: "hi", language: "eng" }, { origin: "" }),
      mockEnv({ origins: `${ORIGIN},` }),
    );
    expect(noOrigin.status).toBe(403);
  });

  it.each([
    ["no question", { language: "eng" }],
    ["an empty question", { question: "   ", language: "eng" }],
    ["a too long question", { question: "a".repeat(MAX_QUESTION_LENGTH + 1), language: "eng" }],
    ["an unknown language", { question: "hi", language: "de" }],
    ["not an object", "hi"],
  ])("rejects %s without calling the API", async (_, body) => {
    const { client, stream } = mockClient([]);
    const response = await createHandler(() => client)(ask(body), mockEnv());
    expect(response.status).toBe(400);
    expect(stream).not.toHaveBeenCalled();
  });

  it("refuses an IP over the rate limits and a spent budget", async () => {
    const { client, stream } = mockClient([textDelta("x")]);
    const handler = createHandler(() => client);
    const question = { question: "hi", language: "eng" };

    expect((await handler(ask(question), mockEnv({ allowed: false }))).status).toBe(429);
    const ipSpent = mockEnv({ usedByIp: DEFAULT_IP_DAILY_LIMIT });
    const ipResponse = await handler(ask(question), ipSpent);
    expect(ipResponse.status).toBe(429);
    expect(await ipResponse.text()).toBe(IP_DAILY_LIMIT_REACHED);
    expect(ipSpent.BUDGET.put).not.toHaveBeenCalled();

    const spent = mockEnv({ used: DEFAULT_DAILY_LIMIT });
    expect((await handler(ask(question), spent)).status).toBe(503);
    expect(spent.BUDGET.put).not.toHaveBeenCalled();

    // "0" turns the assistant off
    expect((await handler(ask(question), mockEnv({ vars: { DAILY_LIMIT: "0" } }))).status).toBe(
      503,
    );

    expect(stream).not.toHaveBeenCalled();
  });

  it.each(["max_tokens", "refusal"])("breaks the stream off on %s", async (stopReason) => {
    const { client } = mockClient([textDelta("Partial"), stop(stopReason)]);
    const response = await createHandler(() => client)(
      ask({ question: "hi", language: "eng" }),
      mockEnv(),
    );
    await expect(response.text()).rejects.toThrow();
  });

  it("breaks the stream off when the API fails", async () => {
    const { client } = mockClient([textDelta("Partial")], { fail: true });
    const response = await createHandler(() => client)(
      ask({ question: "hi", language: "eng" }),
      mockEnv(),
    );
    await expect(response.text()).rejects.toThrow();
  });
});
