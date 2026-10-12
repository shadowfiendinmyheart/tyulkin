import { normalizeInput } from "../utils";

// cookieless analytics (Umami): the build adds its script only when UMAMI_WEBSITE_ID is set
// (webpack.config.js); without it — in dev, tests and builds without the variable — events are dropped
declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string>) => void };
  }
}

type AnalyticsEvent = [event: string, data: Record<string, string>];

// enough for a command with a param ("set theme"), not for whatever was typed or pasted
const MAX_INPUT_WORDS = 2;
const MAX_INPUT_LENGTH = 40;
// events sent before the deferred script runs (a deep link runs its command right away)
const MAX_PENDING_EVENTS = 10;
const SCRIPT_SELECTOR = "script[data-website-id]";

// per script element: the events waiting for it, or "settled" once it has loaded or failed
const pendingByScript = new WeakMap<Element, AnalyticsEvent[] | "settled">();

const send = ([event, data]: AnalyticsEvent) => {
  try {
    window.umami?.track(event, data);
  } catch {
    // analytics must never break the terminal
  }
};

const track = (...analyticsEvent: AnalyticsEvent) => {
  if (window.umami) {
    send(analyticsEvent);
    return;
  }
  // no script in the page: analytics is off; a loaded script without `umami` or a blocked one: dropped
  const script = document.querySelector(SCRIPT_SELECTOR);
  if (!script) return;
  const pending = pendingByScript.get(script);
  if (pending === "settled") return;
  if (pending) {
    if (pending.length < MAX_PENDING_EVENTS) pending.push(analyticsEvent);
    return;
  }

  pendingByScript.set(script, [analyticsEvent]);
  const settle = (event: Event) => {
    const events = pendingByScript.get(script);
    pendingByScript.set(script, "settled");
    script.removeEventListener("load", settle);
    script.removeEventListener("error", settle);
    if (event.type === "load" && Array.isArray(events)) events.forEach(send);
  };
  script.addEventListener("load", settle);
  script.addEventListener("error", settle);
};

// a recognized command, by its canonical name: aliases and casing are folded into it
export const trackCommand = (name: string) => track("command", { name });

// the first words of an unknown command, without what looks like personal data (emails, numbers):
// hints at missing aliases and sections
export const trackUnknownCommand = (input: string) =>
  track("unknown-command", {
    input: normalizeInput(input)
      .split(" ")
      .slice(0, MAX_INPUT_WORDS)
      .join(" ")
      .slice(0, MAX_INPUT_LENGTH)
      .split(" ")
      .map((word) => (word.includes("@") ? "<email>" : word.replace(/\d+/g, "#")))
      .join(" "),
  });
