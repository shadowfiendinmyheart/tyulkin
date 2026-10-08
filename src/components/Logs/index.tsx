import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import styles from "./styles.module.scss";

const Logs: React.FC = () => {
  const { consoleState } = useConsoleContext();
  const { logs } = consoleState;

  return (
    // role="log" is a polite live region: screen readers announce new logs (command output)
    <div className={styles.list} role="log" aria-live="polite">
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
