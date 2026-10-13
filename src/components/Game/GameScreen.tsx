import React from "react";
import { useT } from "../../context/localizationContext";
import { GameId } from "../../domain";
import { GameAction, games } from "../../games";
import storage from "../../storage";
import { isBrowserShortcut } from "../../utils";

import styles from "./styles.module.scss";

// loaded on the first run of a game (see Game): the games are not a part of the main bundle

export interface GameResult {
  score: number;
  // the best score, this one included
  record: number;
  isNewRecord: boolean;
}

export interface GameScreenProps {
  game: GameId;
  onExit: (result: GameResult) => void;
}

// by the physical key, so WASD works on any layout; the arrows by the key too (no code in old browsers)
const KEY_ACTIONS: Record<string, GameAction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  Space: "drop",
};
const RESTART_CODES = ["Enter", "NumpadEnter", "KeyR"];

// a shorter touch is a tap
const SWIPE_PX = 24;

const swipeAction = (dx: number, dy: number): GameAction => {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
};

// a game over the console: a character grid, the score with the record, the controls and the exit;
// keys and taps go to the game only, nothing beneath is typed or pressed
const GameScreen: React.FC<GameScreenProps> = ({ game, onExit }) => {
  const t = useT();
  const definition = games[game];
  const [state, setState] = React.useState(() => definition.create(Math.random));
  // the best score before this round
  const [record, setRecord] = React.useState(() => storage.getGameRecord(game));
  const score = definition.score(state);
  const isOver = definition.isOver(state);

  // the round is over: its score is kept if it is the record
  React.useEffect(() => {
    if (isOver) storage.setGameRecord(game, score);
  }, [game, isOver, score]);

  // a hidden tab pauses the game: the timers would go on, slowed down, without the player
  const [isHidden, setIsHidden] = React.useState(() => document.hidden);
  React.useEffect(() => {
    const handleVisibilityChange = () => setIsHidden(document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const act = React.useCallback(
    (action: GameAction) =>
      setState((current: unknown) => definition.act(current, action, Math.random)),
    [definition],
  );

  const restart = React.useCallback(() => {
    setRecord(storage.getGameRecord(game));
    setState(definition.create(Math.random));
  }, [definition, game]);

  // what the handlers installed once need of the latest render
  const latestRef = React.useRef({ score, record, isOver, onExit });
  React.useLayoutEffect(() => {
    latestRef.current = { score, record, isOver, onExit };
  }, [score, record, isOver, onExit]);

  // closed by the exit or by leaving the page (the browser's back): the score counts
  React.useEffect(() => () => void storage.setGameRecord(game, latestRef.current.score), [game]);

  const exit = React.useCallback(() => {
    const { score, record, onExit } = latestRef.current;
    onExit({ score, record: Math.max(score, record), isNewRecord: score > record });
  }, []);

  // the game moves on its own (snake, tetris); it stops when the round is over or the tab is hidden
  const tickMs = isOver || isHidden ? undefined : definition.tickMs?.(state);
  React.useEffect(() => {
    const { tick } = definition;
    if (tickMs === undefined || !tick) return;
    const timer = setInterval(
      () => setState((current: unknown) => tick(current, Math.random)),
      tickMs,
    );
    return () => clearInterval(timer);
  }, [definition, tickMs]);

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const exitButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (isBrowserShortcut(e)) return;
      e.preventDefault();
      const code = e.code || e.key;
      const isExitFocused = e.target === exitButtonRef.current;
      if (isExitFocused && !["Tab", "Enter", " "].includes(e.key)) {
        // a game key after Tab plays again: Space and Enter press the exit only right after Tab
        dialogRef.current?.focus({ preventScroll: true });
      }
      if (e.key === "Escape") {
        exit();
      } else if (e.key === "Tab") {
        // the exit is the only control: the focus stays in the dialog
        exitButtonRef.current?.focus();
      } else if (isExitFocused && (e.key === "Enter" || e.key === " ")) {
        exit();
      } else if (latestRef.current.isOver) {
        // a held key of the last move must not start a new round at once
        if (RESTART_CODES.includes(code) && !e.repeat) restart();
      } else {
        const action = KEY_ACTIONS[code] ?? KEY_ACTIONS[e.key];
        if (action) act(action);
      }
    };
    // capture on window: before the console's own listeners on document and the input
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [act, exit, restart]);

  // the focus moves into the dialog (a phone hides the keyboard of the command line) and is back after
  React.useEffect(() => {
    const focused = document.activeElement;
    dialogRef.current?.focus({ preventScroll: true });
    if (!(focused instanceof HTMLElement)) return;
    return () => focused.focus({ preventScroll: true });
  }, []);

  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    // the exit button is pressed, not played
    if (!start || (e.target instanceof Element && e.target.closest("button"))) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const isTap = Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX;
    if (isOver) {
      if (isTap) restart();
    } else if (isTap) {
      if (definition.tap) act(definition.tap);
    } else {
      const action = swipeAction(dx, dy);
      act(action === "down" ? definition.swipeDown : action);
    }
  };

  const lines = definition.render(state);
  const gridSize = {
    "--columns": lines[0]?.length ?? 1,
    "--rows": lines.length,
  } as React.CSSProperties;

  return (
    // clicks and taps stay here: the console beneath doesn't focus its input on them
    <div
      className={styles.game}
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={game}
      style={gridSize}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <p className={styles.score}>
        {t({
          key: "gameScore",
          args: { score: String(score), record: String(Math.max(score, record)) },
        })}
      </p>
      <pre className={styles.grid} aria-hidden="true">
        {lines.join("\n")}
      </pre>
      <p className={styles.hint} role="status">
        {t({ key: isOver ? "gameOver" : definition.hintKey })}
      </p>
      <button ref={exitButtonRef} type="button" className={styles.exit} onClick={exit}>
        {t({ key: "gameExit" })}
      </button>
    </div>
  );
};

export default GameScreen;
