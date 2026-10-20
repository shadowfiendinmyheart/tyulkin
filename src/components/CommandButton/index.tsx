import React from "react";
import cn from "clsx";
import { useHandlerContext } from "../../context/handlerContext";
import styles from "./styles.module.scss";

interface CommandButtonProps {
  command: string;
  // shown instead of the command: a file name of `ls`
  label?: string;
  // more styles: the echoed input of a block keeps the color of the text (TASK-82)
  className?: string;
}

// a highlighted command name; a click runs it as if it was typed (for mouse and touch users)
const CommandButton: React.FC<CommandButtonProps> = ({ command, label = command, className }) => {
  const { executeCommand } = useHandlerContext();

  return (
    <button
      type="button"
      className={cn(styles.command, className)}
      // what a click runs, when the label doesn't say it
      title={label === command ? undefined : command}
      onClick={() => executeCommand(command)}
    >
      {label}
    </button>
  );
};

export default CommandButton;
