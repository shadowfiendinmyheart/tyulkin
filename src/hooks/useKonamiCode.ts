import React from "react";

// ↑↑↓↓←→←→BA
export const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

// the code goes on with letters after this many keys (the arrows)
const LETTERS_START = KONAMI_CODE.findIndex((key) => key.length === 1);

// how many first keys of the code the latest keys end with
const countMatched = (keys: string[]) => {
  for (let length = Math.min(keys.length, KONAMI_CODE.length); length > 0; length--) {
    if (keys.slice(-length).join() === KONAMI_CODE.slice(0, length).join()) return length;
  }
  return 0;
};

// pressed on their own while typing a capital letter: not a part of the code
const MODIFIER_KEYS = ["Shift", "Control", "Alt", "Meta", "CapsLock"];

// letters regardless of case; on a non-Latin layout e.key is a local letter ("и"),
// so the physical key decides
const normalizeKey = (e: KeyboardEvent) => {
  if (e.key.length !== 1) return e.key;
  const key = e.key.toLowerCase();
  if (/^[a-z]$/.test(key) || !/^Key[A-Z]$/.test(e.code)) return key;
  return e.code.slice(3).toLowerCase();
};

// calls onEnter when the Konami code is typed anywhere on the page
export const useKonamiCode = (onEnter: () => void) => {
  const onEnterRef = React.useRef(onEnter);
  React.useLayoutEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  React.useEffect(() => {
    // the latest keys: the code may start in the middle of other keys ("↑↑↑↓↓…")
    let keys: string[] = [];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (MODIFIER_KEYS.includes(e.key)) return;
      keys = [...keys, normalizeKey(e)].slice(-KONAMI_CODE.length);
      const matched = countMatched(keys);
      // B and A after the arrows are a part of the code, not typed into the command line
      if (matched > LETTERS_START) e.preventDefault();
      if (matched !== KONAMI_CODE.length) return;
      keys = [];
      onEnterRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
};
