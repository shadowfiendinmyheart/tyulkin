import { IP_DAILY_LIMIT_REACHED, MAX_QUESTION_LENGTH } from "../../ask-proxy/protocol";
import { Languages, TFunction } from "../localization/interfaces";
import { LogContent } from "../store/console/interfaces";

// the proxy of `ask` (TASK-71, ask-proxy/); empty in a build without ASK_PROXY_URL: no `ask` then
export const askUrl = __ASK_URL__;

// the answer hasn't started by then: the proxy hangs, the wait ends
export const ASK_TIMEOUT_MS = 60_000;
const SUPERSEDED = "superseded";

// the answer being printed: a new `ask` stops it, so two answers don't mix, and the proxy stops
// generating (and charging for) the rest of it
let current: AbortController | undefined;

// stops the answer being printed (`clear`): its printed lines stay, the rest is dropped
export const stopAsk = () => current?.abort(SUPERSEDED);

interface AskOptions {
  url: string;
  question: string;
  language: Languages;
  log: (content: LogContent) => void;
  // marks the block of the command failed (TASK-82): with every error
  fail: () => void;
  t: TFunction;
}

const getErrorKey = async (response: Response) => {
  // the budget of the day, for everyone or for this visitor
  if (response.status === 503) return "askBudgetSpent";
  if (response.status !== 429) return "askUnavailable";
  const text = await response.text().catch(() => "");
  return text === IP_DAILY_LIMIT_REACHED ? "askBudgetSpent" : "askRateLimited";
};

// asks the proxy and prints the answer as it comes: line by line, each one is typed out as it arrives.
// The answer is the model's text: plain strings, never links or commands
export const ask = async ({ url, question, language, log, fail, t }: AskOptions) => {
  const error = (text: string) => {
    log({ type: "text", text, color: "error" });
    fail();
  };
  if (!question) {
    log(t({ key: "askUsage" }));
    return;
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    error(t({ key: "askTooLong", args: { max: String(MAX_QUESTION_LENGTH) } }));
    return;
  }

  stopAsk();
  const controller = new AbortController();
  current = controller;
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
  // once the answer starts it is streamed to its end, however long it takes
  const onStart = () => clearTimeout(timer);
  try {
    await streamAnswer({ url, question, language, log, t }, controller.signal, error, onStart);
  } finally {
    clearTimeout(timer);
    if (current === controller) current = undefined;
  }
};

const streamAnswer = async (
  { url, question, language, log, t }: Omit<AskOptions, "fail">,
  signal: AbortSignal,
  error: (text: string) => void,
  onStart: () => void,
) => {
  log({ type: "text", text: t({ key: "askThinking" }), color: "muted" });
  // a newer `ask` took over: this one ends silently, its printed lines stay
  const isSuperseded = () => signal.aborted && signal.reason === SUPERSEDED;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, language }),
      signal,
    });
  } catch {
    if (!isSuperseded()) error(t({ key: "askUnavailable" }));
    return;
  }
  onStart();
  if (!response.ok || !response.body) {
    error(t({ key: await getErrorKey(response) }));
    return;
  }

  const reader = response.body.getReader();
  // fetch errors the body on abort too, but only once the request is still open: the reader is
  // cancelled in any case
  signal.addEventListener("abort", () => void reader.cancel().catch(() => {}));
  const decoder = new TextDecoder();
  let pending = "";
  let answered = false;
  const logLine = (line: string) => {
    // blank lines between paragraphs: a log is a line of its own anyway
    if (!line.trim()) return;
    log(line);
    answered = true;
  };
  let isBroken = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = (pending + decoder.decode(value, { stream: true })).split("\n");
      pending = lines.pop() ?? "";
      lines.forEach(logLine);
    }
    pending += decoder.decode();
  } catch {
    isBroken = true;
  }
  if (isSuperseded()) return;
  logLine(pending);
  if (!answered) error(t({ key: "askUnavailable" }));
  else if (isBroken) error(t({ key: "askInterrupted" }));
};
