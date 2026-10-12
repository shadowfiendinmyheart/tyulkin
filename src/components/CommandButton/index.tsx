import React from "react";
import { useHandlerContext } from "../../context/handlerContext";
import styles from "./styles.module.scss";

interface CommandButtonProps {
  command: string;
}

// a highlighted command name; a click runs it as if it was typed (for mouse and touch users)
const CommandButton: React.FC<CommandButtonProps> = ({ command }) => {
  const { executeCommand } = useHandlerContext();

  return (
    <button type="button" className={styles.command} onClick={() => executeCommand(command)}>
      {command}
    </button>
  );
};

export default CommandButton;
