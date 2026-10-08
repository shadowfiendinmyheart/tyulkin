import React from "react";
import { getAutocompleteCommands } from "../../../commandHandlers/utils";
import { useConsoleContext } from "../../../context/consoleContext";
import { useHandlerContext } from "../../../context/handlerContext";
import { setCommandsHint } from "../../../store/console/actions";

export const useCommandsHint = (
  inputValue: string,
  // replaces the line and moves the caret to its end
  replaceInputValue: (value: string) => void,
) => {
  const { allCommands } = useHandlerContext();
  const { consoleDispatch } = useConsoleContext();
  const tabCounterRef = React.useRef(0);
  const isTabSwitchMode = React.useRef(false);
  const oldUserInputRef = React.useRef("");

  // a single option is completed right away, so there is nothing to list
  const showCommandsHint = (commands: string[]) =>
    consoleDispatch(setCommandsHint(commands.length > 1 ? commands : []));

  React.useEffect(() => {
    if (!isTabSwitchMode.current) oldUserInputRef.current = inputValue;
  }, [inputValue]);

  const commandsHintHandleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();

      const autocompleteCommands = getAutocompleteCommands(allCommands, oldUserInputRef.current);

      // the options don't change while Tab cycles through them, so the hint is set once;
      // several options are listed first and completed from the next Tab on
      if (!isTabSwitchMode.current) {
        isTabSwitchMode.current = true;
        showCommandsHint(autocompleteCommands);
        if (autocompleteCommands.length > 1) return false;
      }

      if (autocompleteCommands.length === 0) return false;
      let autocompletedCommand = autocompleteCommands[tabCounterRef.current];
      if (!autocompletedCommand) {
        tabCounterRef.current = 0;
        autocompletedCommand = autocompleteCommands[0];
      }
      tabCounterRef.current = tabCounterRef.current + 1;
      replaceInputValue(autocompletedCommand);
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
