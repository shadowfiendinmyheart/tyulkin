import React from "react";
import History from "../History";
import Input from "../Input";
import CommandsHint from "../CommandsHint";
import styles from "./styles.module.scss";

const Console: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      <History />
      <Input />
      <CommandsHint />
    </div>
  );
};

export default Console;
