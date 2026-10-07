import React from "react";
import { useConsoleContext } from "../../../context/consoleContext";

// -1 means "not browsing": the input shows the draft the user is typing
const DRAFT_POSITION = -1;

export const useHistoryCommands = (
  inputValue: string,
  setInputValue: React.Dispatch<React.SetStateAction<string>>,
  setCaretPosition: React.Dispatch<React.SetStateAction<number>>,
  inputRef: React.RefObject<HTMLInputElement>,
) => {
  const historyPosition = React.useRef<number>(DRAFT_POSITION);
  const draft = React.useRef<string>("");
  const { consoleState } = useConsoleContext();
  const { history } = consoleState;

  // any edit (typing, Tab autocomplete) turns the current line into the new draft
  const resetHistoryBrowsing = () => {
    historyPosition.current = DRAFT_POSITION;
  };

  const historyCommandsHandleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const updateInput = (newCommand: string) => {
      setInputValue(newCommand);
      const newCaretPosition = newCommand.length;
      setCaretPosition(newCaretPosition - 1);
      setTimeout(() => inputRef.current?.setSelectionRange(newCaretPosition, newCaretPosition));
    };

    switch (e.key) {
      case "ArrowUp": {
        // the native action moves the caret to the line start, out of sync with the drawn caret
        e.preventDefault();
        if (historyPosition.current >= history.length - 1) return;
        if (historyPosition.current === DRAFT_POSITION) draft.current = inputValue;
        historyPosition.current += 1;
        updateInput(history[historyPosition.current]);
        break;
      }

      case "ArrowDown": {
        e.preventDefault();
        if (historyPosition.current === DRAFT_POSITION) return;
        historyPosition.current -= 1;
        updateInput(
          historyPosition.current === DRAFT_POSITION
            ? draft.current
            : history[historyPosition.current],
        );
        break;
      }

      case "Enter": {
        resetHistoryBrowsing();
        draft.current = "";
        break;
      }
    }
  };

  return { historyCommandsHandleKeyDownInput, resetHistoryBrowsing };
};
