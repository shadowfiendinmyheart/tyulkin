import React from "react";
import { useConsoleContext } from "../../../context/consoleContext";
import { addHistoryCommand, changeCurrentHistoryCommand } from "../../../store/console/actions";

export const useHistoryCommands = (setInputValue: any, setCaretPosition: any, inputRef: any) => {
  const historyPosition = React.useRef<number>(0);
  const { consoleDispatch, consoleState } = useConsoleContext();
  const { userCommands } = consoleState;

  const historyCommandsHandleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    consoleDispatch(changeCurrentHistoryCommand(value));
  };

  const historyCommandsHandleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const updateInput = (newCommand: string) => {
      setInputValue(newCommand);
      const newCaretPosition = newCommand.length;
      setCaretPosition(newCaretPosition - 1);
      setTimeout(() => inputRef.current?.setSelectionRange(newCaretPosition, newCaretPosition));
    };

    switch (e.code) {
    case "ArrowUp": {
      if (!userCommands.length) return;
      historyPosition.current =
          historyPosition.current === userCommands.length - 1
            ? historyPosition.current
            : historyPosition.current + 1;

      const nextCommand = userCommands[historyPosition.current];
      updateInput(nextCommand);
      break;
    }

    case "ArrowDown": {
      if (!userCommands.length) return;
      historyPosition.current =
          historyPosition.current === 0 ? historyPosition.current : historyPosition.current - 1;

      const prevCommand = userCommands[historyPosition.current];
      updateInput(prevCommand);
      break;
    }

    case "Enter": {
      historyPosition.current = 0;
      const command = userCommands[0].trim();
      if (command) {
        if (historyPosition.current !== 0) {
          consoleDispatch(changeCurrentHistoryCommand(command));
        }
        consoleDispatch(addHistoryCommand(""));
      }
      break;
    }

    default: {
      historyPosition.current = 0;
      break;
    }
    }
  };

  return { historyCommandsHandleKeyDownInput, historyCommandsHandleChangeInput };
};
