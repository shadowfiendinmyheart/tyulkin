import React from "react";
import cn from "clsx";
import { useT } from "../../context/localizationContext";

import styles from "./styles.module.scss";

// the keys a virtual keyboard lacks, as in Termux's extra keys row; `key` is KeyboardEvent.key
export const EXTRA_KEYS = [
  { label: "Tab", key: "Tab" },
  { label: "↑", key: "ArrowUp" },
  { label: "↓", key: "ArrowDown" },
  { label: "←", key: "ArrowLeft" },
  { label: "→", key: "ArrowRight" },
  { label: "Esc", key: "Escape" },
  { label: "Ctrl", key: "Control" },
  { label: "|", key: "|" },
  { label: "/", key: "/" },
] as const;

// the letters of the Russian layout (ЙЦУКЕН) by the Latin ones on the same physical keys
const LATIN_BY_CYRILLIC: Record<string, string> = Object.fromEntries(
  Array.from("йцукенгшщзфывапролдячсмить", (cyrillic, index) => [
    cyrillic,
    "qwertyuiopasdfghjklzxcvbnm"[index],
  ]),
);

// the codes of the non-letter keys of the row
const CODE_BY_KEY: Record<string, string> = { "|": "Backslash", "/": "Slash" };

// the physical key, as a physical keyboard reports it: Ctrl shortcuts check it for letters on
// non-Latin layouts
const getKeyCode = (key: string) => {
  const latin = /^[a-z]$/i.test(key) ? key : LATIN_BY_CYRILLIC[key.toLowerCase()];
  if (latin) return `Key${latin.toUpperCase()}`;
  return CODE_BY_KEY[key] ?? key;
};

const keyboardEventInit = (key: string, ctrlKey: boolean): KeyboardEventInit => ({
  key,
  code: getKeyCode(key),
  ctrlKey,
  bubbles: true,
  cancelable: true,
});

// a key press is a keydown on the input, handled by the same handlers as a physical key; what the
// browser does by itself after an unprevented physical key (a typed char, a moved caret) is done here
const pressKey = (input: HTMLInputElement, key: string, ctrlKey: boolean) => {
  const isNotPrevented = input.dispatchEvent(
    new KeyboardEvent("keydown", keyboardEventInit(key, ctrlKey)),
  );
  if (isNotPrevented) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    // Ctrl+<char> types nothing; Ctrl+arrow moves the caret too (by a char here, not a word)
    if (key.length === 1 && !ctrlKey) {
      // React sees the change on the input event (the value is changed past its setter)
      input.setRangeText(key, start, end, "end");
      input.dispatchEvent(
        new InputEvent("input", { bubbles: true, inputType: "insertText", data: key }),
      );
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      const position =
        key === "ArrowLeft" ? Math.max(0, end - 1) : Math.min(input.value.length, end + 1);
      input.setSelectionRange(position, position);
      // the Input syncs the drawn caret on select
      input.dispatchEvent(new Event("select"));
    }
  }
  input.dispatchEvent(new KeyboardEvent("keyup", keyboardEventInit(key, ctrlKey)));
};

// focus changes on the page: whether the input is focused is read from document.activeElement
const subscribeToFocus = (onChange: () => void) => {
  document.addEventListener("focusin", onChange);
  document.addEventListener("focusout", onChange);
  return () => {
    document.removeEventListener("focusin", onChange);
    document.removeEventListener("focusout", onChange);
  };
};

// the line before a char typed with Ctrl on, to put it back
interface TypedWithCtrl {
  value: string;
  start: number | null;
  end: number | null;
  char: string;
}

interface ExtraKeysProps {
  // the native input of the command line
  input: HTMLInputElement | null;
}

// the row over the virtual keyboard while the command line is focused (on touch screens only,
// see the styles): Tab, arrows, Esc, a sticky Ctrl and chars that are deep in phone layouts
const ExtraKeys: React.FC<ExtraKeysProps> = ({ input }) => {
  const t = useT();
  const isInputFocused = React.useSyncExternalStore(subscribeToFocus, () =>
    Boolean(input && document.activeElement === input),
  );
  // Ctrl applies to the next key: of this row or of the virtual keyboard
  const [isCtrlOn, setIsCtrlOn] = React.useState(false);
  // for the input event listeners
  const isCtrlOnRef = React.useRef(isCtrlOn);
  const changeCtrl = React.useCallback((isOn: boolean) => {
    isCtrlOnRef.current = isOn;
    setIsCtrlOn(isOn);
  }, []);

  React.useEffect(() => {
    if (!input) return;
    const handleBlur = () => changeCtrl(false);

    // a char typed on the virtual keyboard with Ctrl on is a Ctrl shortcut, not a char. Virtual
    // keyboards send keydown "Unidentified", only the input events tell the char; an IME
    // composition can't be prevented, then the input is put back as it was after the event
    let typedWithCtrl: TypedWithCtrl | null = null;
    // the word being composed by the IME: a composition event reports the whole of it
    let composed = "";
    const handleCompositionStart = () => {
      composed = "";
    };
    const pressWithCtrl = (char: string) => {
      changeCtrl(false);
      pressKey(input, char.toLowerCase(), true);
    };
    const handleBeforeInput = (e: InputEvent) => {
      typedWithCtrl = null;
      const data = e.data ?? "";
      const previousComposed = composed;
      if (e.inputType === "insertCompositionText") composed = data;
      if (!isCtrlOnRef.current) return;
      // one typed char: a paste, a word of the suggestion strip, a deletion inside a composed
      // word are not; they use up Ctrl, as Enter and Backspace do
      const chars = [...data];
      const isTyped =
        (e.inputType === "insertText" && chars.length === 1) ||
        (e.inputType === "insertCompositionText" &&
          data.startsWith(previousComposed) &&
          chars.length === [...previousComposed].length + 1);
      if (!isTyped) {
        changeCtrl(false);
        return;
      }
      const char = chars[chars.length - 1];
      if (e.cancelable) {
        e.preventDefault();
        pressWithCtrl(char);
        return;
      }
      composed = previousComposed;
      typedWithCtrl = {
        value: input.value,
        start: input.selectionStart,
        end: input.selectionEnd,
        char,
      };
    };
    const handleInput = (e: Event) => {
      if (!typedWithCtrl) return;
      const { value, start, end, char } = typedWithCtrl;
      typedWithCtrl = null;
      // through the setter: React sees no change and keeps the line it has (a value set by a
      // script also ends the composition in Chrome, so the IME doesn't bring the char back)
      input.value = value;
      input.setSelectionRange(start, end);
      e.stopImmediatePropagation();
      pressWithCtrl(char);
    };
    // Enter of the virtual keyboard (a single-line input has no input event for it)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isTrusted && e.key === "Enter") changeCtrl(false);
    };

    input.addEventListener("blur", handleBlur);
    input.addEventListener("beforeinput", handleBeforeInput);
    input.addEventListener("input", handleInput);
    input.addEventListener("compositionstart", handleCompositionStart);
    input.addEventListener("keydown", handleKeyDown);
    return () => {
      input.removeEventListener("blur", handleBlur);
      input.removeEventListener("beforeinput", handleBeforeInput);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("compositionstart", handleCompositionStart);
      input.removeEventListener("keydown", handleKeyDown);
    };
  }, [input, changeCtrl]);

  if (!input || !isInputFocused) return null;

  const handleClick = (key: string) => {
    if (key === "Control") {
      changeCtrl(!isCtrlOn);
      return;
    }
    changeCtrl(false);
    pressKey(input, key, isCtrlOn);
  };

  return (
    <div className={styles.extraKeys} role="group" aria-label={t({ key: "extraKeysLabel" })}>
      {EXTRA_KEYS.map(({ label, key }) => (
        <button
          key={key}
          type="button"
          className={cn(styles.key, key === "Control" && isCtrlOn && styles.keyOn)}
          aria-pressed={key === "Control" ? isCtrlOn : undefined}
          // the input keeps the focus, so the virtual keyboard stays open
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleClick(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default ExtraKeys;
