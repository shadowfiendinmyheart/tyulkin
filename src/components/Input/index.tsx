import React from "react";
import Char from "../Char";
import { useConsoleContext } from "../../context/consoleContext";
import { useHandlerContext } from "../../context/handlerContext";
import { addHistoryCommand, addUserLog } from "../../store/console/actions";
import { usePathnameLocation } from "../../hooks/usePathnameLocation";
import { useCommandsHint } from "./hooks/useCommandsHint";
import { useHistoryCommands } from "./hooks/useHistoryCommands";

import styles from "./styles.module.scss";

// selections are collapsed to selectionEnd (see noSelectEventHandler), so it is the real caret;
// the caret is drawn on the char before it
const readCaretPosition = (input: HTMLInputElement) =>
  (input.selectionEnd ?? input.value.length) - 1;

const Input: React.FC = () => {
  const { commandHandler } = useHandlerContext();
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

    // e.code is empty on virtual keyboards, e.key is reliable
    if (e.key === "Enter") {
      const command = inputValue.trim();
      setInputValue("");
      if (command && command !== history[0]) consoleDispatch(addHistoryCommand(command));

      consoleDispatch(addUserLog(command, pathnameLocation));
      commandHandler(command);
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
      inputRef.current && inputRef.current.focus();
    };

    // focus on click/tap opens the virtual keyboard on mobile (it must happen inside a user gesture)
    const clickFocusEventHandler = () => {
      const isTextSelected = Boolean(window.getSelection()?.toString());
      if (isTextSelected) return; // don't break copying text from logs
      autoFocusEventHandler();
    };

    const input = inputRef.current;
    input?.addEventListener("select", noSelectEventHandler, false);
    // input-level selectionchange (Firefox) keeps the caret in sync while an arrow key is held;
    // React's onSelect covers the rest
    input?.addEventListener("selectionchange", syncCaretPosition, false);
    document.addEventListener("keydown", autoFocusEventHandler, false);
    document.addEventListener("click", clickFocusEventHandler, false);
    return () => {
      input?.removeEventListener("select", noSelectEventHandler, false);
      input?.removeEventListener("selectionchange", syncCaretPosition, false);
      document.removeEventListener("keydown", autoFocusEventHandler, false);
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
          <Char key={index} isCaret={caretPosition === index}>
            {char}
          </Char>
        ))}
      </div>
    </div>
  );
};

export default Input;
