import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import { LogColor, LogNode } from "../../store/console/interfaces";
import styles from "./styles.module.scss";

const colorClassNames: Record<LogColor, string> = {
  muted: styles.muted,
  accent: styles.accent,
  error: styles.error,
};

const renderNode = (node: LogNode): React.ReactNode => {
  if (typeof node === "string") return node;

  switch (node.type) {
    case "text":
      return <span className={colorClassNames[node.color]}>{node.text}</span>;
    case "link":
      // mailto: and tel: open an app, a new tab would stay blank
      return /^https?:/.test(node.href) ? (
        <a className={styles.link} href={node.href} target="_blank" rel="noreferrer">
          {node.text}
        </a>
      ) : (
        <a className={styles.link} href={node.href}>
          {node.text}
        </a>
      );
    case "command":
      return <span className={styles.command}>{node.command}</span>;
    case "table":
      return (
        <table className={styles.table}>
          <tbody>
            {node.rows.map((row, rowIndex) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
                  <td key={cellIndex}>{renderNodes(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "pre":
      return <pre className={styles.pre}>{node.text}</pre>;
  }
};

const renderNodes = (nodes: LogNode[]) =>
  nodes.map((node, index) => (
    // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
    <React.Fragment key={index}>{renderNode(node)}</React.Fragment>
  ));

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
            {renderNodes(log.content)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Logs;
