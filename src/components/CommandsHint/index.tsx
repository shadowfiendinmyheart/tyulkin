import React from "react";
import cn from "clsx";
import { useConsoleContext } from "../../context/consoleContext";

import styles from "./style.module.scss";

const CommandsHint: React.FC = () => {
  const { consoleState } = useConsoleContext();
  const { commandsHint } = consoleState;

  return (
    <div className={cn([styles.commandsHint, commandsHint.length === 0 && styles.hide])}>
      {commandsHint.map((command) => {
        return (
          <span key={command} className={styles.command}>
            {command}
          </span>
        );
      })}
    </div>
  );
};

export default CommandsHint;
