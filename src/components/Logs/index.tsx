import React from "react";
import cn from "clsx";
import { useConsoleContext } from "../../context/consoleContext";
import CommandButton from "../CommandButton";
import TextLink from "../TextLink";
import { Echo, Log, LogColor, LogNode } from "../../store/console/interfaces";
import { getNodesLength, sliceNodes } from "../../store/console/logNodes";
import { finishTyping, skipTyping } from "../../store/console/actions";
import { prefersReducedMotion } from "../../utils";
import styles from "./styles.module.scss";

// typing out: a few characters a tick, a long output still takes at most ~MAX_TICKS ticks
const TICK_MS = 16;
const MIN_CHARS_PER_TICK = 2;
const MAX_TICKS = 50;

// how many characters of the log are typed out; counted by the elapsed time, not by ticks,
// so a throttled timer (background tab) doesn't stretch the animation
const useTypedLength = (log: Log | undefined, onTyped: (log: Log) => void) => {
  const [typed, setTyped] = React.useState({ logId: -1, length: 0 });

  React.useEffect(() => {
    if (!log) return;
    const length = getNodesLength(log.content);
    const charsPerTick = Math.max(MIN_CHARS_PER_TICK, Math.ceil(length / MAX_TICKS));
    const start = Date.now();
    const timer = setInterval(() => {
      const ticks = Math.max(1, Math.floor((Date.now() - start) / TICK_MS));
      const typedLength = Math.min(ticks * charsPerTick, length);
      setTyped({ logId: log.id, length: typedLength });
      if (typedLength === length) {
        clearInterval(timer);
        onTyped(log);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [log, onTyped]);

  // progress changes on every tick, also on the last one, when the log is already typed out
  return { typedLength: typed.logId === log?.id ? typed.length : 0, progress: typed };
};

const colorClassNames: Record<LogColor, string> = {
  text: styles.text,
  muted: styles.muted,
  accent: styles.accent,
  error: styles.error,
  success: styles.success,
  warning: styles.warning,
  "ansi-black": styles.ansiBlack,
  "ansi-red": styles.ansiRed,
  "ansi-green": styles.ansiGreen,
  "ansi-yellow": styles.ansiYellow,
  "ansi-blue": styles.ansiBlue,
  "ansi-magenta": styles.ansiMagenta,
  "ansi-cyan": styles.ansiCyan,
  "ansi-white": styles.ansiWhite,
  "ansi-bright-black": styles.ansiBrightBlack,
  "ansi-bright-red": styles.ansiBrightRed,
  "ansi-bright-green": styles.ansiBrightGreen,
  "ansi-bright-yellow": styles.ansiBrightYellow,
  "ansi-bright-blue": styles.ansiBrightBlue,
  "ansi-bright-magenta": styles.ansiBrightMagenta,
  "ansi-bright-cyan": styles.ansiBrightCyan,
  "ansi-bright-white": styles.ansiBrightWhite,
};

const renderNode = (node: LogNode): React.ReactNode => {
  if (typeof node === "string") return node;

  switch (node.type) {
    case "text":
      return (
        <span className={colorClassNames[node.color]} aria-hidden={node.decorative || undefined}>
          {node.text}
        </span>
      );
    case "link":
      return (
        <TextLink className={styles.link} href={node.href}>
          {node.text}
        </TextLink>
      );
    case "command":
      return <CommandButton command={node.command} label={node.label} theme={node.theme} />;
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
      return (
        <pre
          className={cn(styles.pre, node.qr ? styles.qr : node.decorative && styles.art)}
          aria-hidden={node.decorative || undefined}
          // a QR code shrinks to the width of a phone by its columns
          style={
            node.qr
              ? ({ "--qr-columns": node.text.split("\n")[0].length } as React.CSSProperties)
              : undefined
          }
        >
          {node.text}
        </pre>
      );
  }
};

const renderNodes = (nodes: LogNode[]) =>
  nodes.map((node, index) => (
    // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
    <React.Fragment key={index}>{renderNode(node)}</React.Fragment>
  ));

// "14:03:07": when a command was entered
const formatTime = (time: number) => {
  const date = new Date(time);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

// the echoed input heads the block of its command (TASK-82): a click on the command runs it
// again. The status and the time are drawn by CSS from empty spans, so the text of the line
// (copied, read by screen readers) stays the input as it was entered
const EchoItem = ({ prompt, input, command, time, failed }: Echo) => (
  <li className={cn(styles.log, styles.echo)}>
    {`${prompt} `}
    {command ? (
      <CommandButton command={command} label={input} className={styles.echoCommand} />
    ) : (
      input
    )}
    {command && <span className={failed ? styles.failed : styles.succeeded} />}
    <span className={styles.time} data-time={formatTime(time)} />
  </li>
);

// a typed out log never changes, so only the one being typed re-renders on a tick
const LogItem = React.memo(function LogItem({ content, echo }: Pick<Log, "content" | "echo">) {
  if (echo) return <EchoItem {...echo} />;
  return <li className={styles.log}>{renderNodes(content)}</li>;
});

// what shows everything being typed out at once: a key, a click or tap, scrolling up by wheel
// or touch (or it would be pulled back to the bottom), selecting text (it would shift under the cursor)
const SKIP_EVENTS = ["keydown", "click", "wheel", "touchmove", "selectstart"] as const;

interface LogsProps {
  // called on every typed out tick: the console scrolls to its bottom
  onTypingProgress?: () => void;
}

const Logs: React.FC<LogsProps> = ({ onTypingProgress }) => {
  const { consoleState, consoleDispatch } = useConsoleContext();
  const { logs, typedLogId } = consoleState;
  // read once: logs typed out so far stay as they are; with reduced motion
  // typedLogId is ignored, every log is shown at once
  const [isMotionReduced] = React.useState(prefersReducedMotion);
  const typingLog = isMotionReduced ? undefined : logs.find((log) => log.id === typedLogId);

  const handleTyped = React.useCallback(
    (log: Log) => consoleDispatch(finishTyping(log.id)),
    [consoleDispatch],
  );
  const { typedLength, progress } = useTypedLength(typingLog, handleTyped);
  // the typing log appears with its first characters, not as an empty line
  const shownLogs = isMotionReduced
    ? logs
    : logs.filter((log) => log.id < typedLogId || (log === typingLog && typedLength > 0));

  // listened in the capture phase: the key still goes to the input after it,
  // and a clicked command prints after the shown logs. Not on pointerdown: the re-render would
  // swap a half-typed command for its button between pointerdown and click, losing the click
  const isTyping = Boolean(typingLog);
  React.useEffect(() => {
    if (!isTyping) return;
    const skip = () => consoleDispatch(skipTyping());
    SKIP_EVENTS.forEach((type) => document.addEventListener(type, skip, true));
    return () => SKIP_EVENTS.forEach((type) => document.removeEventListener(type, skip, true));
  }, [isTyping, consoleDispatch]);

  React.useLayoutEffect(() => {
    if (progress.logId !== -1) onTypingProgress?.();
  }, [progress, onTypingProgress]);

  return (
    // role="log" is a polite live region: screen readers announce new logs (command output);
    // aria-busy holds the announcement until the log is typed out
    <div className={styles.list} role="log" aria-live="polite" aria-busy={isTyping}>
      <ul>
        {/* id, not index: once the oldest logs are dropped, index keys would rewrite every
            item's text, and the live region could announce them all again */}
        {shownLogs.map((log) => (
          <LogItem
            key={log.id}
            content={log === typingLog ? sliceNodes(log.content, typedLength) : log.content}
            echo={log.echo}
          />
        ))}
      </ul>
    </div>
  );
};

export default Logs;
