import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import { useHandlerContext } from "../../context/handlerContext";
import { useT } from "../../context/localizationContext";

import styles from "./styles.module.scss";

// where a newcomer starts; a page shows only the ones it has (settings: just help)
export const QUICK_COMMANDS = ["about", "projects", "contacts", "help"];
// typed commands after which the visitor clearly doesn't need the chips
export const QUICK_COMMANDS_TYPED_LIMIT = 3;

// chips over the command line: a tap runs a command without the virtual keyboard,
// which covers half of a phone screen
const QuickCommands: React.FC = () => {
  const { executeCommand, allCommands } = useHandlerContext();
  const { typedCommandsCount } = useConsoleContext().consoleState;
  const t = useT();

  const commands = QUICK_COMMANDS.filter((command) => allCommands.includes(command));
  if (typedCommandsCount >= QUICK_COMMANDS_TYPED_LIMIT || commands.length === 0) return null;

  return (
    <div
      className={styles.quickCommands}
      role="group"
      aria-label={t({ key: "quickCommandsLabel" })}
    >
      {commands.map((command) => (
        <button
          key={command}
          type="button"
          className={styles.chip}
          onClick={() => executeCommand(command)}
        >
          {command}
        </button>
      ))}
    </div>
  );
};

export default QuickCommands;
