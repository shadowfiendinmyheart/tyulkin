import React from "react";
import History from "../History";
import Input from "../Input";
import styles from "./styles.module.scss";

const Console: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      <History />
      <Input />
    </div>
  );
};

export default Console;
