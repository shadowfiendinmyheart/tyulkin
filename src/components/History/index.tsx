import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import styles from "./styles.module.scss";

const History: React.FC = () => {
  const { consoleState } = useConsoleContext();
  const { logs } = consoleState;

  return (
    <div className={styles.list}>
      <ul>
        {logs.map((log, index) => (
          <li key={index} className={styles.log}>
            {log.isUserPrint && <span className={styles.tag}>{`${log.location}>`}</span>}
            {log.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default History;
