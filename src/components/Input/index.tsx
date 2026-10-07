import React from "react";
import Char from "../Char";
import { SetState } from "../../commandHandlers/interfaces";
import { Logs } from "../../store/console/interfaces";
import { useGlobalHandlerContext } from "../../context/globalHandlerContext";
import { useConsoleContext } from "../../context/consoleContext";
import { useHandlerContext } from "../../context/handlerContext";
import { addHistoryCommand, addUserLog } from "../../store/console/actions";
import { usePathnameLocation } from "../../hooks/usePathnameLocation";
import { useCommandsHint } from "./hooks/useCommandsHint";
import { useHistoryCommands } from "./hooks/useHistoryCommands";

import styles from "./styles.module.scss";

interface InputProps {
  setLogs?: SetState<Logs>;
}

const Input: React.FC<InputProps> = () => {
  const { commandHandler } = useHandlerContext();
  const { commandHandler: globalHandler } = useGlobalHandlerContext();
  const { consoleDispatch, consoleState } = useConsoleContext();
  const { logs, history } = consoleState;
  const [inputValue, setInputValue] = React.useState<string>("");
  const [caretPosition, setCaretPosition] = React.useState<number>(inputValue.length - 1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const consoleInputRef = React.useRef<HTMLDivElement>(null);
  const pathnameLocation = usePathnameLocation();
  const { commandsHintHandleKeyDownInput } = useCommandsHint(
    inputValue,
    setInputValue,
    setCaretPosition,
  );
  const { historyCommandsHandleKeyDownInput, resetHistoryBrowsing } = useHistoryCommands(
    inputValue,
    setInputValue,
    setCaretPosition,
    inputRef,
  );

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;

    // virtual keyboards send key "Unidentified" on keydown, so the caret is synced here
    const caretPosition = Number(e.currentTarget.selectionStart) - 1;
    setCaretPosition(() => caretPosition);

    setInputValue(value);
    resetHistoryBrowsing();
  };

  const allowedKeyUpKeyCodes = ["ArrowLeft", "ArrowRight", "Backspace", "MetaRight", "MetaLeft"];

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
      const isContextCommand = commandHandler(command);
      if (!isContextCommand) globalHandler(command);
    }
  };

  const handleKeyUpInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (input && allowedKeyUpKeyCodes.includes(e.code)) {
      const caretPosition = Number(input.selectionStart) - 1;

      setCaretPosition(() => caretPosition);
    }
  };

  React.useEffect(() => {
    // https://stackoverflow.com/questions/29221991/prevent-select-on-input-text-field
    const noSelectEventHandler = () => {
      if (!inputRef.current) return;
      inputRef.current.selectionStart = inputRef.current.selectionEnd;
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

    inputRef.current?.addEventListener("select", noSelectEventHandler, false);
    document.addEventListener("keydown", autoFocusEventHandler, false);
    document.addEventListener("click", clickFocusEventHandler, false);
    return () => {
      inputRef.current?.removeEventListener("select", noSelectEventHandler, false);
      document.removeEventListener("keydown", autoFocusEventHandler, false);
      document.removeEventListener("click", clickFocusEventHandler, false);
    };
  }, []);

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
        onKeyUp={handleKeyUpInput}
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
