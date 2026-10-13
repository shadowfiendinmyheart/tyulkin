import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt } from "./prompt";
import {
  AnswerLanguage,
  answerLanguages,
  IP_DAILY_LIMIT_REACHED,
  MAX_QUESTION_LENGTH,
} from "./protocol";

// The proxy of `ask` (TASK-71): a Cloudflare Worker (wrangler.toml). The API key stays here, the
// site only gets the answer, streamed as plain text. Status codes the site tells apart:
// 400 a bad question, 403 another origin, 429 too many questions from the IP (a minute or a day),
// 503 the daily budget is spent; a stream that breaks off — the model or the API failed, or the
// answer is incomplete (cut by max_tokens, declined)

// the bindings of wrangler.toml, typed here without @cloudflare/workers-types
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  // a secret: `npx wrangler secret put ANTHROPIC_API_KEY`
  ANTHROPIC_API_KEY: string;
  // the sites allowed to ask, comma-separated: "https://owner.github.io"
  ALLOWED_ORIGINS: string;
  // answers a day for all visitors together, DEFAULT_DAILY_LIMIT without it; "0" turns `ask` off
  DAILY_LIMIT?: string;
  // answers a day for one IP, DEFAULT_IP_DAILY_LIMIT without it: one client can't spend the
  // whole budget from a single address
  IP_DAILY_LIMIT?: string;
  // the model, DEFAULT_MODEL without it
  MODEL?: string;
  // per IP (the [[ratelimits]] binding)
  RATE_LIMITER: RateLimit;
  // the answers counted per day, in total and per IP
  BUDGET: KvNamespace;
}

export const DEFAULT_DAILY_LIMIT = 100;
export const DEFAULT_IP_DAILY_LIMIT = 20;
const DEFAULT_MODEL = "claude-opus-5-5";
// thinking can't be turned off on the default model and counts toward it: room for a short
// thinking pass and an answer of ~120 words; also bounds the price of one answer
const MAX_TOKENS = 2048;

const parseQuestion = async (
  request: Request,
): Promise<{ question: string; language: AnswerLanguage } | undefined> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return undefined;
  }
  if (typeof body !== "object" || body === null) return undefined;
  const { question, language } = body as Record<string, unknown>;
  if (typeof question !== "string" || !answerLanguages.includes(language as AnswerLanguage)) {
    return undefined;
  }
  const trimmed = question.trim();
  if (!trimmed || trimmed.length > MAX_QUESTION_LENGTH) return undefined;
  return { question: trimmed, language: language as AnswerLanguage };
};

// a limit from a variable: a non-negative integer, the default when it is not set or not a number
const parseLimit = (value: string | undefined, fallback: number) => {
  const limit = Number.parseInt(value ?? "", 10);
  return Number.isNaN(limit) || limit < 0 ? fallback : limit;
};

// the counters of a day are kept a bit longer than the day
const COUNTER_TTL = 2 * 24 * 60 * 60;

// The counters are approximate: KV is eventually consistent (reads are cached up to a minute at a
// location) and takes about one write a second per key, so a burst can go over the limits and a
// failed write is skipped rather than failing the answer. They keep the bill in the expected
// range; the hard cap is the spend limit of the API workspace (README)
const readCounter = async (env: Env, key: string) => {
  try {
    return Number(await env.BUDGET.get(key)) || 0;
  } catch {
    return 0;
  }
};
const writeCounter = async (env: Env, key: string, value: number) => {
  try {
    await env.BUDGET.put(key, String(value), { expirationTtl: COUNTER_TTL });
  } catch {
    // a concurrent write of the same key: this answer goes uncounted
  }
};

// counts the answer against the daily limits: "total" — the budget is spent, "ip" — this IP has
// asked enough today, undefined — go on
const takeFromBudget = async (env: Env, ip: string, now: Date) => {
  const day = now.toISOString().slice(0, 10);
  const totalKey = `answers:${day}`;
  const ipKey = `answers:${day}:${ip}`;
  const [total, byIp] = await Promise.all([readCounter(env, totalKey), readCounter(env, ipKey)]);
  if (total >= parseLimit(env.DAILY_LIMIT, DEFAULT_DAILY_LIMIT)) return "total";
  if (byIp >= parseLimit(env.IP_DAILY_LIMIT, DEFAULT_IP_DAILY_LIMIT)) return "ip";
  await Promise.all([writeCounter(env, totalKey, total + 1), writeCounter(env, ipKey, byIp + 1)]);
};

type CreateClient = (apiKey: string) => Anthropic;

export const createHandler =
  (createClient: CreateClient = (apiKey) => new Anthropic({ apiKey })) =>
  async (request: Request, env: Env): Promise<Response> => {
    const origin = request.headers.get("Origin") ?? "";
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
      .map((allowed) => allowed.trim())
      .filter(Boolean);
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    const cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
    const reply = (status: number, text: string) =>
      new Response(text, { status, headers: { ...cors, "Content-Type": "text/plain" } });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    if (request.method !== "POST") return reply(405, "Method Not Allowed");

    const parsed = await parseQuestion(request);
    if (!parsed) return reply(400, "Bad Request");

    // set by Cloudflare for every request
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return reply(429, "Too Many Requests");
    const spent = await takeFromBudget(env, ip, new Date());
    if (spent === "ip") return reply(429, IP_DAILY_LIMIT_REACHED);
    if (spent === "total") return reply(503, "Daily Budget Spent");

    const stream = createClient(env.ANTHROPIC_API_KEY).beta.messages.stream({
      model: env.MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      // a short factual answer: no need for deep thinking
      output_config: { effort: "low" },
      // a declined request is retried on the recommended model on the same stream
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        {
          type: "text",
          text: getSystemPrompt(parsed.language),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: parsed.question }],
    });
    // its errors reach the site through the body below; this keeps an error that comes when no
    // one iterates the stream (the visitor left) from being an unhandled rejection
    stream.done().catch(() => {});

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let stopReason: string | null = null;
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            } else if (event.type === "message_delta") {
              stopReason = event.delta.stop_reason;
            }
          }
          // cut by max_tokens or declined (by the fallback model too): the site must not take the
          // text for a whole answer
          if (stopReason !== "end_turn") throw new Error(`Incomplete answer: ${stopReason}`);
          controller.close();
        } catch (error) {
          // the site sees a broken stream and says the assistant is unavailable
          controller.error(error);
        }
      },
      // the visitor left: stop paying for the rest of the answer
      cancel() {
        stream.abort();
      },
    });
    return new Response(body, {
      headers: {
        ...cors,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  };

export default { fetch: createHandler() };
