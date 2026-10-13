import React from "react";
import { useHandlerContext } from "../../context/handlerContext";
import styles from "./styles.module.scss";

interface CommandButtonProps {
  command: string;
  // shown instead of the command: a file name of `ls`
  label?: string;
}

// a highlighted command name; a click runs it as if it was typed (for mouse and touch users)
const CommandButton: React.FC<CommandButtonProps> = ({ command, label = command }) => {
  const { executeCommand } = useHandlerContext();

  return (
    <button
      type="button"
      className={styles.command}
      // what a click runs, when the label doesn't say it
      title={label === command ? undefined : command}
      onClick={() => executeCommand(command)}
    >
      {label}
    </button>
  );
};

export default CommandButton;
