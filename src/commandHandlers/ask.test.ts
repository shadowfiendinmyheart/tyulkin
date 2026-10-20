import { describe, expect, it, vi } from "vitest";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import { LogContent } from "../store/console/interfaces";
import { IP_DAILY_LIMIT_REACHED, MAX_QUESTION_LENGTH } from "../../ask-proxy/protocol";
import { ask, ASK_TIMEOUT_MS, askUrl, stopAsk } from "./ask";
import { mainCommands } from "./commands/main";

const t = createT(eng);
const URL = "https://ask.example/";
// the block of the command shows ✗ (TASK-82): not checked here
const fail = () => undefined;

// a streamed body, in the given chunks; fail: it breaks off after them
const streamed = (chunks: string[], { fail = false } = {}) => {
  const encoder = new TextEncoder();
  const queue = [...chunks];
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = queue.shift();
      if (chunk !== undefined) controller.enqueue(encoder.encode(chunk));
      else if (fail) controller.error(new Error("broken"));
      else controller.close();
    },
  });
};

const run = async (question: string, response: Response | Error) => {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  const logs: LogContent[] = [];
  const fail = vi.fn();
  await ask({ url: URL, question, language: "eng", log: (content) => logs.push(content), fail, t });
  vi.unstubAllGlobals();
  return { logs, fetchMock, fail };
};

const error = (text: string) => ({ type: "text", text, color: "error" });
const thinking = { type: "text", text: eng.askThinking, color: "muted" };

describe("ask", () => {
  it("is not a command in a build without the proxy", () => {
    expect(askUrl).toBe("");
    expect(mainCommands.map(({ name }) => name)).not.toContain("ask");
  });

  it("prints the answer line by line as it streams, without blank lines", async () => {
    const { logs, fetchMock } = await run(
      "what is your stack?",
      new Response(streamed(["React and Type", "Script.\n\n- MobX", "\n- Zust", "and"])),
    );

    expect(fetchMock).toHaveBeenCalledWith(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "what is your stack?", language: "eng" }),
      signal: expect.any(AbortSignal),
    });
    expect(logs).toEqual([thinking, "React and TypeScript.", "- MobX", "- Zustand"]);
  });

  it("decodes a character split between chunks", async () => {
    const bytes = new TextEncoder().encode("Привет");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 3));
        controller.enqueue(bytes.slice(3));
        controller.close();
      },
    });
    const { logs } = await run("hi", new Response(body));
    expect(logs).toEqual([thinking, "Привет"]);
  });

  it("explains how to ask without sending a question", async () => {
    const { logs, fetchMock, fail } = await run("", new Response(""));
    expect(logs).toEqual([eng.askUsage]);
    expect(fail).not.toHaveBeenCalled();

    const tooLong = await run("a".repeat(MAX_QUESTION_LENGTH + 1), new Response(""));
    expect(tooLong.logs).toEqual([
      error(eng.askTooLong.replace("$max", String(MAX_QUESTION_LENGTH))),
    ]);
    expect(tooLong.fail).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tooLong.fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [429, "Too Many Requests", eng.askRateLimited],
    [429, IP_DAILY_LIMIT_REACHED, eng.askBudgetSpent],
    [503, "", eng.askBudgetSpent],
    [500, "", eng.askUnavailable],
    [400, "", eng.askUnavailable],
  ])("tells the visitor about the status %i %s", async (status, body, text) => {
    const { logs, fail } = await run("hi", new Response(body, { status }));
    expect(logs).toEqual([thinking, error(text)]);
    expect(fail).toHaveBeenCalledOnce();
  });

  it("says the assistant is unavailable without an answer", async () => {
    expect((await run("hi", new TypeError("offline"))).logs).toEqual([
      thinking,
      error(eng.askUnavailable),
    ]);
    expect((await run("hi", new Response(streamed(["\n \n"])))).logs).toEqual([
      thinking,
      error(eng.askUnavailable),
    ]);
    expect((await run("hi", new Response(streamed([], { fail: true })))).logs).toEqual([
      thinking,
      error(eng.askUnavailable),
    ]);
  });

  it("keeps the part of an answer that broke off", async () => {
    const { logs } = await run("hi", new Response(streamed(["Four years\nof Re"], { fail: true })));
    expect(logs).toEqual([thinking, "Four years", "of Re", error(eng.askInterrupted)]);
  });

  // a request that hangs until it is aborted
  const hanging = (_: unknown, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) =>
      init?.signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError"))),
    );

  it("stops the previous answer when asked again", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(hanging)
      .mockResolvedValueOnce(new Response(streamed(["Second"])));
    vi.stubGlobal("fetch", fetchMock);
    const first: LogContent[] = [];
    const second: LogContent[] = [];

    const firstAsk = ask({
      url: URL,
      question: "a",
      language: "eng",
      log: (c) => first.push(c),
      fail,
      t,
    });
    await ask({ url: URL, question: "b", language: "eng", log: (c) => second.push(c), fail, t });
    await firstAsk;
    vi.unstubAllGlobals();

    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
    expect(first).toEqual([thinking]);
    expect(second).toEqual([thinking, "Second"]);
  });

  it("stops printing an answer on clear", async () => {
    let push: (chunk: string) => void = () => {};
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        push = (chunk) => controller.enqueue(new TextEncoder().encode(chunk));
      },
    });
    const fetchMock = vi.fn(async () => new Response(body));
    vi.stubGlobal("fetch", fetchMock);
    const logs: LogContent[] = [];
    const asking = ask({
      url: URL,
      question: "a",
      language: "eng",
      log: (c) => logs.push(c),
      fail,
      t,
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    push("First\n");
    await vi.waitFor(() => expect(logs).toContain("First"));
    stopAsk();
    await asking;
    vi.unstubAllGlobals();
    expect(logs).toEqual([thinking, "First"]);
  });

  it("gives up on a proxy that doesn't answer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(hanging));
    const logs: LogContent[] = [];
    const asking = ask({
      url: URL,
      question: "a",
      language: "eng",
      log: (c) => logs.push(c),
      fail,
      t,
    });
    await vi.advanceTimersByTimeAsync(ASK_TIMEOUT_MS);
    await asking;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    expect(logs).toEqual([thinking, error(eng.askUnavailable)]);
  });
});
