import React from "react";
import Logs from "../Logs";
import Input from "../Input";
import QuickCommands from "../QuickCommands";
import styles from "./styles.module.scss";

interface ConsoleProps {
  // gets the native input of the command line
  onInputElement?: (input: HTMLInputElement | null) => void;
}

const Console: React.FC<ConsoleProps> = ({ onInputElement }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  // the prompt stays in view while an output is typed out below the previous one
  const scrollToBottom = React.useCallback(() => {
    wrapperRef.current?.scrollIntoView({ block: "end" });
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <Logs onTypingProgress={scrollToBottom} />
      <QuickCommands />
      <Input onInputElement={onInputElement} />
    </div>
  );
};

export default Console;
