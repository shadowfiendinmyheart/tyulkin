import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import styles from "./styles.module.scss";

const Logs: React.FC = () => {
  const { consoleState } = useConsoleContext();
  const { logs } = consoleState;

  return (
    <div className={styles.list}>
      <ul>
        {logs.map((log, index) => (
          <li key={index} className={styles.log}>
            {log.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Logs;
