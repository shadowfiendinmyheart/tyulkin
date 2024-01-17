import React from "react";
import Logs from "../Logs";
import Input from "../Input";
import CommandsHint from "../CommandsHint";
import styles from "./styles.module.scss";

const Console: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      <Logs />
      <Input />
      <CommandsHint />
    </div>
  );
};

export default Console;
