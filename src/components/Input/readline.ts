// readline (emacs mode) editing of the command line (TASK-91): what a key does to the line and
// the caret, the caret as selectionEnd (0 — before the first char)

export interface LineState {
  value: string;
  caret: number;
}

export type ReadlineAction =
  | "lineStart"
  | "lineEnd"
  | "killToStart"
  | "killToEnd"
  | "killWordBack"
  | "wordBack"
  | "wordForward"
  | "deleteChar";

// Alt+B/F words are letters and digits, as in readline; Ctrl+W words are split by spaces only
const isWordChar = (char: string) => /[\p{L}\p{N}]/u.test(char);
const isSpace = (char: string) => /\s/.test(char);

// the start of the word before the caret: the non-word chars before it are skipped first
const scanBack = (value: string, from: number, isPart: (char: string) => boolean) => {
  let position = from;
  while (position > 0 && !isPart(value[position - 1])) position -= 1;
  while (position > 0 && isPart(value[position - 1])) position -= 1;
  return position;
};

// the end of the word after the caret, the same way
const scanForward = (value: string, from: number, isPart: (char: string) => boolean) => {
  let position = from;
  while (position < value.length && !isPart(value[position])) position += 1;
  while (position < value.length && isPart(value[position])) position += 1;
  return position;
};

// the line after the action; undefined: nothing changes (the caret is already there, nothing to
// delete)
export const applyReadline = (
  action: ReadlineAction,
  { value, caret }: LineState,
): LineState | undefined => {
  const next = ((): LineState => {
    switch (action) {
      case "lineStart":
        return { value, caret: 0 };
      case "lineEnd":
        return { value, caret: value.length };
      case "killToStart":
        return { value: value.slice(caret), caret: 0 };
      case "killToEnd":
        return { value: value.slice(0, caret), caret };
      case "killWordBack": {
        const start = scanBack(value, caret, (char) => !isSpace(char));
        return { value: value.slice(0, start) + value.slice(caret), caret: start };
      }
      case "wordBack":
        return { value, caret: scanBack(value, caret, isWordChar) };
      case "wordForward":
        return { value, caret: scanForward(value, caret, isWordChar) };
      case "deleteChar": {
        // a whole code point: an emoji is two UTF-16 units
        const char = String.fromCodePoint(value.codePointAt(caret) ?? 0);
        return { value: value.slice(0, caret) + value.slice(caret + char.length), caret };
      }
    }
  })();
  return next.value === value && next.caret === caret ? undefined : next;
};
