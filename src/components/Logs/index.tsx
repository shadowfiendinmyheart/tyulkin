import React from "react";
import cn from "clsx";
import { useConsoleContext } from "../../context/consoleContext";
import CommandButton from "../CommandButton";
import TextLink from "../TextLink";
import { Echo, Log, LogColor, LogNode, RainbowPosition } from "../../store/console/interfaces";
import { ConsoleRouteValues } from "../../router/interfaces";
import { getNodesLength, getNodesText, sliceNodes } from "../../store/console/logNodes";
import { finishTyping, skipTyping } from "../../store/console/actions";
import { getRainbowRuns } from "../../store/console/rainbow";
import { prefersReducedMotion } from "../../utils";
import { useLongPress } from "../../hooks/useLongPress";
import { useT } from "../../context/localizationContext";
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

// `| lolcat` (TASK-99): the colors of a pre block, by the place of each character from its start
// in the output; what is typed out so far keeps its colors as the rest comes
const renderRainbow = (text: string, start: RainbowPosition) =>
  getRainbowRuns(text, start, start.col).runs.map(({ text: run, color }, index) => (
    // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
    <span key={index} className={colorClassNames[color]}>
      {run}
    </span>
  ));

// route: the page the log was printed on, its commands run there (TASK-103)
const renderNode = (node: LogNode, route?: ConsoleRouteValues): React.ReactNode => {
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
      return (
        <CommandButton command={node.command} label={node.label} theme={node.theme} route={route} />
      );
    case "table":
      return (
        <table className={styles.table}>
          <tbody>
            {node.rows.map((row, rowIndex) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
                  <td key={cellIndex}>{renderNodes(cell, route)}</td>
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
          role={node.label ? "img" : undefined}
          aria-label={node.label}
          // a QR code shrinks to the width of a phone by its columns
          style={
            node.qr
              ? ({ "--qr-columns": node.text.split("\n")[0].length } as React.CSSProperties)
              : undefined
          }
        >
          {node.rainbow ? renderRainbow(node.text, node.rainbow) : node.text}
        </pre>
      );
  }
};

const renderNodes = (nodes: LogNode[], route?: ConsoleRouteValues) =>
  nodes.map((node, index) => (
    // eslint-disable-next-line @eslint-react/no-array-index-key -- a log never changes
    <React.Fragment key={index}>{renderNode(node, route)}</React.Fragment>
  ));

// "14:03:07": when a command was entered
const formatTime = (time: number) => {
  const date = new Date(time);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

// a long tap copies the block of a command (TASK-94): its logs are marked while the finger is
// held, then the first one tells whether the block was copied (visual only, as the gesture is)
interface BlockProps {
  // what the block is found by: the blockId of its echo, 0 before the first command
  blockId: number;
  isMarked: boolean;
  copyStatus?: string;
}

const CopyStatus = ({ status }: { status?: string }) =>
  status ? (
    <span className={styles.copyStatus} aria-hidden="true">
      {status}
    </span>
  ) : null;

// the echoed input heads the block of its command (TASK-82): a click on the command runs it
// again. The status and the time are drawn by CSS from empty spans, so the text of the line
// (copied, read by screen readers) stays the input as it was entered
const EchoItem = ({
  echo: { prompt, input, command, time, failed },
  route,
  blockId,
  isMarked,
  copyStatus,
}: { echo: Echo; route?: ConsoleRouteValues } & BlockProps) => (
  <li className={cn(styles.log, styles.echo, isMarked && styles.marked)} data-block={blockId}>
    <CopyStatus status={copyStatus} />
    {`${prompt} `}
    {command ? (
      <CommandButton command={command} label={input} className={styles.echoCommand} route={route} />
    ) : (
      input
    )}
    {command && <span className={failed ? styles.failed : styles.succeeded} />}
    <span className={styles.time} data-time={formatTime(time)} />
  </li>
);

// a typed out log never changes, so only the one being typed re-renders on a tick
const LogItem = React.memo(function LogItem({
  content,
  echo,
  route,
  ...block
}: Pick<Log, "content" | "echo" | "route"> & BlockProps) {
  if (echo) return <EchoItem echo={echo} route={route} {...block} />;
  return (
    <li className={cn(styles.log, block.isMarked && styles.marked)} data-block={block.blockId}>
      <CopyStatus status={block.copyStatus} />
      {renderNodes(content, route)}
    </li>
  );
});

// a block: the echo of a command and the logs after it; the logs before the first echo are one too
const getBlockIds = (logs: Log[]) => {
  const blockIds = new Map<number, number>();
  let blockId = 0;
  for (const log of logs) {
    if (log.echo) blockId = log.echo.blockId;
    blockIds.set(log.id, blockId);
  }
  return blockIds;
};

interface BlockCopy {
  blockId: number;
  // held: the finger is still on it; then whether the clipboard took the text
  status: "held" | "copied" | "failed";
}

// how long the block stays marked with its copy status
export const COPY_STATUS_MS = 1500;

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

  // a long tap copies the block under the finger (TASK-94): the echo and the output of a command,
  // all of it, also what is still being typed out
  const t = useT();
  const blockIds = React.useMemo(() => getBlockIds(logs), [logs]);
  const [copy, setCopy] = React.useState<BlockCopy | null>(null);
  const longPressHandlers = useLongPress({
    select: (target) => {
      const item = target.closest<HTMLElement>("[data-block]");
      return item ? Number(item.dataset.block) : undefined;
    },
    // the whole block is copied: what is still to be typed out is shown at once
    onHold: (blockId) => {
      consoleDispatch(skipTyping());
      setCopy({ blockId, status: "held" });
    },
    onRelease: (blockId) => {
      const text = logs
        .filter((log) => blockIds.get(log.id) === blockId)
        .map((log) => getNodesText(log.content))
        .join("\n");
      const tell = (status: BlockCopy["status"]) => setCopy({ blockId, status });
      if (!navigator.clipboard) {
        tell("failed");
        return;
      }
      navigator.clipboard.writeText(text).then(
        () => tell("copied"),
        () => tell("failed"),
      );
    },
    onAbort: () => setCopy(null),
  });
  // the status is gone after a while; a newer copy restarts the timer
  React.useEffect(() => {
    if (!copy || copy.status === "held") return;
    const timer = setTimeout(() => setCopy(null), COPY_STATUS_MS);
    return () => clearTimeout(timer);
  }, [copy]);
  const copyStatus =
    copy && copy.status !== "held"
      ? t({ key: copy.status === "copied" ? "blockCopied" : "blockNotCopied" })
      : undefined;
  const firstCopiedLogId = copy && logs.find((log) => blockIds.get(log.id) === copy.blockId)?.id;

  return (
    // role="log" is a polite live region: screen readers announce new logs (command output);
    // aria-busy holds the announcement until the log is typed out
    <div
      className={styles.list}
      role="log"
      aria-live="polite"
      aria-busy={isTyping}
      {...longPressHandlers}
    >
      <ul>
        {/* id, not index: once the oldest logs are dropped, index keys would rewrite every
            item's text, and the live region could announce them all again */}
        {shownLogs.map((log) => (
          <LogItem
            key={log.id}
            content={log === typingLog ? sliceNodes(log.content, typedLength) : log.content}
            echo={log.echo}
            route={log.route}
            blockId={blockIds.get(log.id) ?? 0}
            isMarked={copy?.blockId === blockIds.get(log.id)}
            copyStatus={log.id === firstCopiedLogId ? copyStatus : undefined}
          />
        ))}
      </ul>
    </div>
  );
};

export default Logs;
