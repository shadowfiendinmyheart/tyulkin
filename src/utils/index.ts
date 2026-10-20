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

// a key pressed alone: no modifier, not inside an IME composition
export const isPlainKey = (e: React.KeyboardEvent) =>
  !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && !e.nativeEvent.isComposing;

// Ctrl+<letter> (orMeta: or Cmd+<letter>, as on a Mac); Shift/Alt combos are left to the browser
// (Ctrl+Shift+C is DevTools, Ctrl+Alt is AltGr on Windows), an IME composition owns the keys.
// On a non-Latin layout e.key is a local letter ("д"), so the physical key decides
export const isCtrlLetter = (e: KeyboardEvent, letter: string, { orMeta = false } = {}) => {
  const isCtrl = orMeta ? e.ctrlKey || e.metaKey : e.ctrlKey && !e.metaKey;
  if (!isCtrl || e.shiftKey || e.altKey || e.isComposing) return false;
  const key = e.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key === letter;
  return e.code === `Key${letter.toUpperCase()}`;
};

// the browser's own keys (reload, DevTools, back, fullscreen): kept working under a full-page overlay
export const isBrowserShortcut = (e: KeyboardEvent) =>
  e.ctrlKey || e.metaKey || e.altKey || /^F\d{1,2}$/.test(e.key);
