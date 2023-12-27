import React from "react";
import cn from "clsx";
import styles from "./styles.module.scss";
import { useConsoleContext } from "../../context/consoleContext";

export enum CaretMode {
  Vertical = "vertical", // TODO rename
  Bottom = "bottom",
}
interface CaretProps {
  children: string;
}

const Caret: React.FC<CaretProps> = ({ children }) => {
  const { consoleState } = useConsoleContext();
  const { caretMode } = consoleState;

  return (
    <span className={cn(children === " " && styles.spaceChar, styles[caretMode])}>{children}</span>
  );
};

export default Caret;
