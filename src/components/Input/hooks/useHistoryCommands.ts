import React from "react";
import { useConsoleContext } from "../../../context/consoleContext";

// -1 means "not browsing": the input shows the draft the user is typing
const DRAFT_POSITION = -1;

export const useHistoryCommands = (
  inputValue: string,
  // replaces the line and moves the caret to its end
  replaceInputValue: (value: string) => void,
) => {
  const historyPosition = React.useRef<number>(DRAFT_POSITION);
  const draft = React.useRef<string>("");
  const { consoleState } = useConsoleContext();
  const { history } = consoleState;

  // any edit (typing, Tab autocomplete) turns the current line into the new draft
  const resetHistoryBrowsing = () => {
    historyPosition.current = DRAFT_POSITION;
  };

  // a command clicked in logs is added to the history start while an entry may be browsed:
  // the position follows that entry, so the line and the draft stay as they were
  const historyLength = React.useRef(history.length);
  React.useEffect(() => {
    if (historyPosition.current !== DRAFT_POSITION) {
      historyPosition.current += history.length - historyLength.current;
    }
    historyLength.current = history.length;
  }, [history]);

  const historyCommandsHandleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowUp": {
        // the native action moves the caret to the line start, out of sync with the drawn caret
        e.preventDefault();
        if (historyPosition.current >= history.length - 1) return;
        if (historyPosition.current === DRAFT_POSITION) draft.current = inputValue;
        historyPosition.current += 1;
        replaceInputValue(history[historyPosition.current]);
        break;
      }

      case "ArrowDown": {
        e.preventDefault();
        if (historyPosition.current === DRAFT_POSITION) return;
        historyPosition.current -= 1;
        replaceInputValue(
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
