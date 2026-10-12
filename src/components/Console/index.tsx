import React from "react";
import Logs from "../Logs";
import Input from "../Input";
import CommandsHint from "../CommandsHint";
import QuickCommands from "../QuickCommands";
import styles from "./styles.module.scss";

const Console: React.FC = () => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  // the prompt stays in view while an output is typed out below the previous one
  const scrollToBottom = React.useCallback(() => {
    wrapperRef.current?.scrollIntoView({ block: "end" });
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <Logs onTypingProgress={scrollToBottom} />
      <QuickCommands />
      <Input />
      <CommandsHint />
    </div>
  );
};

export default Console;
