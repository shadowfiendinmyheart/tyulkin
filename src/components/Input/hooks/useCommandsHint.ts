import React from "react";
import { getAutocompleteCommands } from "../../../commandHandlers/utils";
import { useConsoleContext } from "../../../context/consoleContext";
import { useHandlerContext } from "../../../context/handlerContext";
import { setCommandsHint } from "../../../store/console/actions";

export const useCommandsHint = (inputValue: string, setInputValue: any, setCaretPosition: any) => {
  const { allCommands } = useHandlerContext();
  const { consoleDispatch } = useConsoleContext();
  const tabCounterRef = React.useRef(0);
  const isTabSwitchMode = React.useRef(false);
  const oldUserInputRef = React.useRef("");

  React.useEffect(() => {
    if (!isTabSwitchMode.current) oldUserInputRef.current = inputValue;
  }, [inputValue]);

  const commandsHintHandleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();

      const autocompleteCommands = getAutocompleteCommands(allCommands, oldUserInputRef.current);

      if (autocompleteCommands.length > 1 && !isTabSwitchMode.current) {
        consoleDispatch(setCommandsHint(autocompleteCommands));
        isTabSwitchMode.current = true;
        return false;
      }
      consoleDispatch(setCommandsHint(autocompleteCommands));

      isTabSwitchMode.current = true;

      if (autocompleteCommands.length === 0) return false;
      let autocompletedCommand = autocompleteCommands[tabCounterRef.current];
      if (!autocompletedCommand) {
        tabCounterRef.current = 0;
        autocompletedCommand = autocompleteCommands[0];
      }
      tabCounterRef.current = tabCounterRef.current + 1;
      setInputValue(autocompletedCommand);
      setCaretPosition(autocompletedCommand.length - 1);
      return false;
    }
    isTabSwitchMode.current = false;
    tabCounterRef.current = 0;

    if (e.key === "Enter") {
      consoleDispatch(setCommandsHint([]));
    }

    return true;
  };

  return { commandsHintHandleKeyDownInput };
};
