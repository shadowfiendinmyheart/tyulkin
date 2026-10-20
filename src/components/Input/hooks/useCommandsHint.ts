import React from "react";
import { getAutocompleteCommands } from "../../../commandHandlers/utils";
import { useConsoleContext } from "../../../context/consoleContext";
import { useHandlerContext } from "../../../context/handlerContext";
import { setCommandsHint } from "../../../store/console/actions";
import { isPlainKey } from "../../../utils";

// pressed alone they change nothing in the line, so the menu stays open
const MODIFIER_KEYS = ["Shift", "Control", "Alt", "Meta", "AltGraph", "CapsLock", "Fn"];

// zsh-like completion menu (TASK-88): the first Tab lists several options, the next ones and
// ↑ ↓ select them in the line, Enter accepts the selected one, Esc puts the typed line back;
// any other key closes the menu
export const useCommandsHint = (
  inputValue: string,
  // replaces the line and moves the caret to its end
  replaceInputValue: (value: string) => void,
) => {
  const { allCommands } = useHandlerContext();
  const { consoleState, consoleDispatch } = useConsoleContext();
  // the options of the open menu; executing a command or Ctrl+L closes it from outside
  const options = consoleState.commandsHint;
  const isMenuOpen = options.length > 0;
  // index of the option in the line, -1: none yet
  const [selected, setSelected] = React.useState(-1);
  // the line the menu was opened for, Esc puts it back
  const [typedLine, setTypedLine] = React.useState("");
  // the option accepted by Enter or a click, while it is still the line: its theme stays
  // previewed until the line runs or changes (TASK-84), not swapped back and forth
  const [acceptedLine, setAcceptedLine] = React.useState<string>();

  const closeMenu = () => {
    if (isMenuOpen) consoleDispatch(setCommandsHint([]));
  };

  // the line holds either the typed one or the selected option; anything else (history by
  // Ctrl+↑, a shortcut, an edit without a key) means the options no longer match it
  const menuLine = selected === -1 ? typedLine : options[selected];
  React.useEffect(() => {
    if (isMenuOpen && inputValue !== menuLine) consoleDispatch(setCommandsHint([]));
  }, [isMenuOpen, inputValue, menuLine, consoleDispatch]);

  const select = (index: number) => {
    setSelected(index);
    replaceInputValue(options[index]);
  };

  // the first step from no selection goes to the first option (or the last one backwards)
  const moveSelection = (step: 1 | -1) => {
    const count = options.length;
    if (selected === -1) select(step === 1 ? 0 : count - 1);
    else select((selected + step + count) % count);
  };

  // a click or a tap on an option
  const pickOption = (index: number) => {
    closeMenu();
    setAcceptedLine(options[index]);
    replaceInputValue(options[index]);
  };

  // false: the key was handled here
  const commandsHintHandleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (isMenuOpen) {
        moveSelection(e.shiftKey ? -1 : 1);
        return false;
      }
      // a page command and a global one may share a phrase: one option for both
      const completions = [...new Set(getAutocompleteCommands(allCommands, inputValue))];
      // a single option is completed right away, so there is nothing to list
      if (completions.length === 1) replaceInputValue(completions[0]);
      if (completions.length > 1) {
        setTypedLine(inputValue);
        setSelected(-1);
        setAcceptedLine(undefined);
        consoleDispatch(setCommandsHint(completions));
      }
      return false;
    }

    if (!isMenuOpen) return true;

    if (isPlainKey(e) && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault(); // the caret would jump to the line start or end
      moveSelection(e.key === "ArrowDown" ? 1 : -1);
      return false;
    }
    // the selected option is already in the line: Enter only accepts it, as in zsh
    if (e.key === "Enter" && selected !== -1) {
      e.preventDefault();
      closeMenu();
      setAcceptedLine(options[selected]);
      return false;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      replaceInputValue(typedLine);
      return false;
    }
    // Ctrl/Cmd shortcuts that change the line close the menu themselves (Ctrl+C, Ctrl+L, Ctrl+R),
    // a copy of the selected logs keeps it
    if (!MODIFIER_KEYS.includes(e.key) && !e.ctrlKey && !e.metaKey) closeMenu();
    return true;
  };

  return {
    commandsHintHandleKeyDownInput,
    commandsHintOptions: options,
    // stale while the menu is closed
    commandsHintSelected: isMenuOpen ? selected : -1,
    // the option shown in the line: selected in the open menu, or accepted from it
    commandsHintShownOption: isMenuOpen
      ? options[selected]
      : inputValue === acceptedLine
        ? acceptedLine
        : undefined,
    pickCommandsHintOption: pickOption,
    // the line was edited without a key (paste, voice input, a virtual keyboard's suggestion)
    closeCommandsHint: closeMenu,
  };
};
