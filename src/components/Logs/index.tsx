import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import styles from "./styles.module.scss";
import { splitLinks } from "./utils";

const Logs: React.FC = () => {
  const { consoleState } = useConsoleContext();
  const { logs } = consoleState;

  return (
    // role="log" is a polite live region: screen readers announce new logs (command output)
    <div className={styles.list} role="log" aria-live="polite">
      <ul>
        {/* id, not index: once the oldest logs are dropped, index keys would rewrite every
            item's text, and the live region could announce them all again */}
        {logs.map((log) => (
          <li key={log.id} className={styles.log}>
            {log.withLinks
              ? splitLinks(log.message).map(({ text, start, href }) =>
                  href ? (
                    <a
                      key={start}
                      className={styles.link}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {text}
                    </a>
                  ) : (
                    <React.Fragment key={start}>{text}</React.Fragment>
                  ),
                )
              : log.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Logs;
