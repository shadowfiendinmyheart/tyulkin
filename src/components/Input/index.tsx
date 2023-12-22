import React from "react";
import cn from "clsx";
import Caret from "../Caret";
import { SetState } from "../../commandHandlers/interfaces";
import { Logs } from "../../store/console/interfaces";
import { useGlobalHandlerContext } from "../../context/globalHandlerContext";
import { useConsoleContext } from "../../context/consoleContext";
import { useHandlerContext } from "../../context/handlerContext";
import { addUserCommand, addUserLog, changeFirstUserCommand } from "../../store/console/actions";
import styles from "./styles.module.scss";
import { useLocation } from "react-router-dom";
import { RoutesValues } from "../../router/interfaces";
import { usePathnameLocation } from "../../hooks/usePathnameLocation";

interface InputProps {
  setLogs?: SetState<Logs>;
}

const Input: React.FC<InputProps> = () => {
  const { commandHandler } = useHandlerContext();
  const { commandHandler: globalHandler } = useGlobalHandlerContext();
  const { consoleDispatch, consoleState } = useConsoleContext();
  const [inputValue, setInputValue] = React.useState<string>("");
  const [caretPostition, setCaretPosition] = React.useState<number>(inputValue.length - 1);
  const historyPosition = React.useRef<number>(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pathnameLocation = usePathnameLocation();

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;

    const input = inputRef.current;
    const nativeEventData = (e.nativeEvent as InputEvent).data;
    if (input && !nativeEventData) {
      // long press backspace
      const caretPosition = Number(input.selectionStart);
      setCaretPosition((prev) => caretPosition);
    }

    setInputValue(value);
    consoleDispatch(changeFirstUserCommand(value));
  };

  const allowedKeyUpKeyCodes = ["ArrowLeft", "ArrowRight", "Backspace", "MetaRight", "MetaLeft"];

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "ArrowUp") {
      if (!consoleState.userCommands.length) return;
      historyPosition.current =
        historyPosition.current === consoleState.userCommands.length - 1
          ? historyPosition.current
          : historyPosition.current + 1;

      const nextCommand = consoleState.userCommands[historyPosition.current];
      setInputValue(nextCommand);
      const newCaretPosition = nextCommand.length;
      setCaretPosition(nextCommand.length - 1);
      setTimeout(() => inputRef.current?.setSelectionRange(newCaretPosition, newCaretPosition));
    }

    if (e.code === "ArrowDown") {
      if (!consoleState.userCommands.length) return;
      historyPosition.current =
        historyPosition.current === 0 ? historyPosition.current : historyPosition.current - 1;

      const prevCommand = consoleState.userCommands[historyPosition.current];
      setInputValue(prevCommand);
      const newCaretPosition = prevCommand.length;
      setCaretPosition(newCaretPosition);
      setTimeout(() => inputRef.current?.setSelectionRange(newCaretPosition, newCaretPosition));
    }

    if (e.code === "Enter") {
      const command = inputValue.trim();
      if (command) {
        if (historyPosition.current !== 0) {
          consoleDispatch(changeFirstUserCommand(inputValue));
        }
        consoleDispatch(addUserCommand(""));
      }
      setInputValue("");
      historyPosition.current = 0;

      consoleDispatch(addUserLog(command, pathnameLocation));
      const isContextCommand = commandHandler(command);
      if (!isContextCommand) globalHandler(command);
      return;
    }

    if (allowedKeyUpKeyCodes.includes(e.code)) return;
    if (e.key.length !== 1) return; // prevent moving caret on shift, ctrl and etc...

    const input = inputRef.current;
    if (input) {
      const caretPosition = Number(input.selectionStart);

      setCaretPosition((prev) => caretPosition);
    }
  };

  const handleKeyUpInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (input && allowedKeyUpKeyCodes.includes(e.code)) {
      const caretPosition = Number(input.selectionStart) - 1;

      setCaretPosition((prev) => caretPosition);
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

    inputRef.current?.addEventListener("select", noSelectEventHandler, false);
    document.addEventListener("keydown", autoFocusEventHandler, false);
    return () => {
      inputRef.current?.removeEventListener("select", noSelectEventHandler, false);
      document.removeEventListener("keydown", autoFocusEventHandler, false);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <span>{pathnameLocation}&gt;</span>
      <div className={styles.inputWrapper}>
        <input
          className={styles.nativeInput}
          type="text"
          value={inputValue}
          onChange={handleChangeInput}
          onKeyDown={handleKeyDownInput}
          onKeyUp={handleKeyUpInput}
          autoFocus
          ref={inputRef}
        />
        <div className={styles.fancyInput}>
          {inputValue.split("").map((char, index) =>
            caretPostition === index ? (
              <Caret key={index}>{char}</Caret>
            ) : (
              <span className={cn(char === " " && styles.spaceChar)} key={index}>
                {char}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
};

export default Input;
