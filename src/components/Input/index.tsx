import React from "react";
import Char from "../Char";
import CommandButton from "../CommandButton";
import { useConsoleContext } from "../../context/consoleContext";
import { useHandlerContext } from "../../context/handlerContext";
import {
  addUserLog,
  clearLogs,
  countTypedCommand,
  setCommandsHint,
} from "../../store/console/actions";
import { usePathnameLocation } from "../../hooks/usePathnameLocation";
import { useCommandsHint } from "./hooks/useCommandsHint";
import { useHistoryCommands } from "./hooks/useHistoryCommands";
import { useT } from "../../context/localizationContext";
import { withNode } from "../../store/console/logNodes";

import styles from "./styles.module.scss";

// selections are collapsed to selectionEnd (see noSelectEventHandler), so it is the real caret;
// the caret is drawn on the char before it
const readCaretPosition = (input: HTMLInputElement) =>
  (input.selectionEnd ?? input.value.length) - 1;

// terminal-style Ctrl+<letter>; Shift/Alt/Meta combos are left to the browser
// (Ctrl+Shift+C is DevTools, Ctrl+Alt is AltGr on Windows).
// On a non-Latin layout e.key is a local letter ("д"), so the physical key decides
const isCtrlShortcut = (e: React.KeyboardEvent, letter: string) => {
  if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return false;
  if (e.nativeEvent.isComposing) return false; // IME composition owns the keys
  const key = e.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key === letter;
  return e.code === `Key${letter.toUpperCase()}`;
};

// text selected on the page (in logs); the input's own selection is always collapsed
const isTextSelected = () => Boolean(window.getSelection()?.toString());

const Input: React.FC = () => {
  const { executeCommand } = useHandlerContext();
  const { consoleDispatch, consoleState } = useConsoleContext();
  const { logs, history } = consoleState;
  const [inputValue, setInputValue] = React.useState<string>("");
  // index of the char the caret is drawn on (-1 — before the first char), see readCaretPosition
  const [caretPosition, setCaretPosition] = React.useState<number>(-1);
  // bumped by replaceInputValue, so the caret moves to the end even if the value is unchanged
  const [caretToEndRequest, setCaretToEndRequest] = React.useState<number>(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const consoleInputRef = React.useRef<HTMLDivElement>(null);
  const pathnameLocation = usePathnameLocation();
  const t = useT();
  const hintId = React.useId();
  // a newcomer sees how to start until the first command is executed
  const isHintShown = history.length === 0 && inputValue.length === 0;

  // programmatic line replacement (Tab autocomplete, history): the caret goes to the end
  const replaceInputValue = (value: string) => {
    setInputValue(value);
    setCaretToEndRequest((request) => request + 1);
  };

  const { commandsHintHandleKeyDownInput } = useCommandsHint(inputValue, replaceInputValue);
  const { historyCommandsHandleKeyDownInput, resetHistoryBrowsing } = useHistoryCommands(
    inputValue,
    replaceInputValue,
  );

  // the native input is the single source of truth for the caret
  const syncCaretPosition = React.useCallback(() => {
    if (inputRef.current) setCaretPosition(readCaretPosition(inputRef.current));
  }, []);

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.currentTarget.value);
    // batched with the value (virtual keyboards send key "Unidentified", so keys can't be relied on)
    syncCaretPosition();
    resetHistoryBrowsing();
  };

  // programmatic value changes (Enter, Tab autocomplete, history) and caret-to-end requests
  // resync the drawn caret; after typing this is a no-op, onChange has already synced it
  const handledCaretToEndRequest = React.useRef<number>(0);
  React.useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (handledCaretToEndRequest.current !== caretToEndRequest) {
      handledCaretToEndRequest.current = caretToEndRequest;
      input.setSelectionRange(input.value.length, input.value.length);
    }
    setCaretPosition(readCaretPosition(input));
  }, [inputValue, caretToEndRequest]);

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isContinue = commandsHintHandleKeyDownInput(e);
    if (!isContinue) {
      // Tab autocomplete replaced the line
      resetHistoryBrowsing();
      return;
    }

    historyCommandsHandleKeyDownInput(e);

    // Ctrl+L clears the screen like `clear`, the typed line stays
    if (isCtrlShortcut(e, "l")) {
      e.preventDefault(); // the browser would focus the address bar
      consoleDispatch(clearLogs());
      consoleDispatch(setCommandsHint([]));
      return;
    }

    // Ctrl+C drops the typed line as in bash: it is echoed with ^C and not added to history;
    // with text selected on the page it stays a copy
    if (isCtrlShortcut(e, "c") && !isTextSelected()) {
      e.preventDefault();
      consoleDispatch(addUserLog(`${inputValue}^C`, pathnameLocation));
      consoleDispatch(setCommandsHint([]));
      setInputValue("");
      resetHistoryBrowsing();
      return;
    }

    // e.code is empty on virtual keyboards, e.key is reliable
    if (e.key === "Enter") {
      setInputValue("");
      // the visitor got used to typing: the quick commands give way (clicks don't count)
      if (inputValue.trim()) consoleDispatch(countTypedCommand());
      executeCommand(inputValue);
    }
  };

  React.useEffect(() => {
    // https://stackoverflow.com/questions/29221991/prevent-select-on-input-text-field
    const noSelectEventHandler = () => {
      if (!inputRef.current) return;
      inputRef.current.selectionStart = inputRef.current.selectionEnd;
      syncCaretPosition();
    };

    const autoFocusEventHandler = () => {
      inputRef.current?.focus();
    };

    // focus on click/tap opens the virtual keyboard on mobile (it must happen inside a user gesture)
    const clickFocusEventHandler = (e: MouseEvent) => {
      if (isTextSelected()) return; // don't break copying text from logs
      // a link in logs opens a new tab, a command button prints its output: don't pop up
      // the virtual keyboard and scroll to the prompt
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      autoFocusEventHandler();
    };

    // focusing the input drops the page selection: keep it for Ctrl/Cmd+C on selected logs
    const keyDownFocusEventHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && isTextSelected()) return;
      // Enter/Space on a focused command button press it, Enter on a link follows it
      if (e.target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
      if (e.target instanceof HTMLAnchorElement && e.key === "Enter") return;
      autoFocusEventHandler();
    };

    const input = inputRef.current;
    input?.addEventListener("select", noSelectEventHandler, false);
    // input-level selectionchange (Firefox) keeps the caret in sync while an arrow key is held;
    // React's onSelect covers the rest
    input?.addEventListener("selectionchange", syncCaretPosition, false);
    document.addEventListener("keydown", keyDownFocusEventHandler, false);
    document.addEventListener("click", clickFocusEventHandler, false);
    return () => {
      input?.removeEventListener("select", noSelectEventHandler, false);
      input?.removeEventListener("selectionchange", syncCaretPosition, false);
      document.removeEventListener("keydown", keyDownFocusEventHandler, false);
      document.removeEventListener("click", clickFocusEventHandler, false);
    };
  }, [syncCaretPosition]);

  React.useEffect(() => {
    if (consoleInputRef.current) {
      consoleInputRef.current.scrollIntoView({ block: "end" });
    }
  }, [inputValue, logs]);

  return (
    <div className={styles.wrapper} ref={consoleInputRef}>
      <span className={styles.locator}>{pathnameLocation}&gt;</span>
      <input
        className={styles.nativeInput}
        type="text"
        aria-label={t({ key: "inputLabel" })}
        aria-describedby={isHintShown ? hintId : undefined}
        value={inputValue}
        onChange={handleChangeInput}
        onKeyDown={handleKeyDownInput}
        // React fires onSelect on any selection change: arrows, Home/End, Delete, click, paste
        onSelect={syncCaretPosition}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        ref={inputRef}
      />
      <div className={styles.chars}>
        {caretPosition === -1 || inputValue.length === 0 ? (
          <Char isCaret={true} className={styles.zeroChar} />
        ) : undefined}
        {inputValue.split("").map((char, index) => (
          // characters repeat and have no identity of their own: the position is the key
          // eslint-disable-next-line @eslint-react/no-array-index-key
          <Char key={index} isCaret={caretPosition === index}>
            {char}
          </Char>
        ))}
      </div>
      {isHintShown && (
        <span id={hintId} className={styles.hint}>
          {withNode((help) => t({ key: "inputHint", args: { help } }), {
            type: "command",
            command: "help",
          }).map((node, index) => (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- the hint never reorders
            <React.Fragment key={index}>
              {typeof node === "string"
                ? node
                : node.type === "command" && <CommandButton command={node.command} />}
            </React.Fragment>
          ))}
        </span>
      )}
    </div>
  );
};

export default Input;
