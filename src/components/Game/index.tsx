import React from "react";
import { useConsoleContext } from "../../context/consoleContext";
import { useT } from "../../context/localizationContext";
import { addConsoleLog, setGame } from "../../store/console/actions";
import { RunningGame } from "../../store/console/interfaces";
import { isBrowserShortcut } from "../../utils";
import type { GameResult, GameScreenProps } from "./GameScreen";

import styles from "./styles.module.scss";

// the games are a chunk of their own, loaded on the first run (TASK-66); a failed load shows
// LoadFailed instead, and the next run tries again
const lazyScreen = () =>
  React.lazy(() =>
    import(/* webpackChunkName: "games" */ "./GameScreen").catch(() => {
      // the loading was cancelled by Esc: no LoadFailed to reset it, so it is reset here
      if (!mountedGames) GameScreen = lazyScreen();
      return { default: LoadFailed };
    }),
  );

let GameScreen = lazyScreen();
let mountedGames = 0;

// the game could not be loaded (offline before the chunk was cached): logged, the game is closed,
// its command is marked failed (TASK-101)
const LoadFailed: React.FC<GameScreenProps> = () => {
  const t = useT();
  const { consoleState, consoleDispatch: dispatch } = useConsoleContext();
  // the game that failed: taken once, the state has none after setGame(null)
  const [game] = React.useState(consoleState.game);
  // StrictMode runs the effect twice on mount: logged once
  const isLoggedRef = React.useRef(false);
  React.useEffect(() => {
    if (isLoggedRef.current) return;
    isLoggedRef.current = true;
    GameScreen = lazyScreen();
    dispatch(setGame(null));
    dispatch(
      addConsoleLog(
        { type: "text", text: t({ key: "gameLoadFailed" }), color: "error" },
        game?.blockId,
      ),
    );
    game?.fail();
  }, [dispatch, t, game]);
  return null;
};

// while the games load (a slow network): the keys don't reach the console beneath, Esc cancels
const Loading: React.FC = () => {
  const t = useT();
  const { consoleDispatch: dispatch } = useConsoleContext();
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (isBrowserShortcut(e)) return;
      e.preventDefault();
      if (e.key === "Escape") dispatch(setGame(null));
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [dispatch]);
  return (
    <div className={styles.game} role="status">
      {t({ key: "loading" })}
    </div>
  );
};

interface GameProps {
  game: RunningGame;
}

// a mini-game over the console; on exit the score is logged into the block of its command
const Game: React.FC<GameProps> = ({ game: { id: game, blockId } }) => {
  React.useEffect(() => {
    mountedGames++;
    return () => {
      mountedGames--;
    };
  }, []);
  const t = useT();
  const { consoleDispatch: dispatch } = useConsoleContext();

  const exit = React.useCallback(
    ({ score, record, isNewRecord }: GameResult) => {
      dispatch(setGame(null));
      const args = { game, score: String(score) };
      dispatch(
        addConsoleLog(
          isNewRecord
            ? t({ key: "gameNewRecord", args })
            : t({ key: "gameResult", args: { ...args, record: String(record) } }),
          blockId,
        ),
      );
    },
    [dispatch, game, blockId, t],
  );

  return (
    <React.Suspense fallback={<Loading />}>
      <GameScreen game={game} onExit={exit} />
    </React.Suspense>
  );
};

export default Game;
