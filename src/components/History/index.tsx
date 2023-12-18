import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import styles from "./styles.module.scss";

const History: React.FC = () => {
  const endLogsRef = React.useRef<HTMLDivElement>(null);
  const { consoleState } = useConsoleContext();
  const { logs } = consoleState;

  React.useEffect(() => {
    // autoscroll to bottom logs
    if (endLogsRef.current) {
      endLogsRef.current.scrollIntoView();
    }
  }, [logs]);

  return (
    <div className={styles.list}>
      <ul>
        {logs.map((log, index) => (
          <li key={index} className={styles.log}>
            {log.isUserPrint && <span className={styles.tag}>{"cv>"}</span>}
            {log.message}
          </li>
        ))}
      </ul>
      <div ref={endLogsRef} />
    </div>
  );
};

export default History;
