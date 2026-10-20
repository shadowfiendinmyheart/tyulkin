import React from "react";
import cn from "clsx";
import styles from "./styles.module.scss";
import { useConsoleContext } from "../../context/consoleContext";

interface CharProps extends React.HTMLAttributes<HTMLSpanElement> {
  isCaret: boolean;
  children?: string;
}

const Char: React.FC<CharProps> = ({ isCaret, children = " ", className, ...props }) => {
  const { consoleState } = useConsoleContext();
  const { caretMode } = consoleState;

  return (
    <span
      {...props}
      className={cn(
        children === " " && styles.spaceChar,
        isCaret && styles[caretMode],
        styles.char,
        className,
      )}
    >
      {children}
    </span>
  );
};

export default Char;
