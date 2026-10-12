export const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export const makeCapitalize = (str: string) => {
  return str.toLowerCase()[0].toUpperCase() + str.slice(1);
};

// jsdom has no matchMedia: motion is allowed there unless a test stubs it
export const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// the input as commands are matched: "  Set   Theme " -> "set theme"
export const normalizeInput = (userCommand: string) =>
  userCommand.trim().replace(/\s+/g, " ").toLowerCase();
