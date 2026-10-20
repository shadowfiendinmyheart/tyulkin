import React from "react";
import { Outlet, useLocation } from "react-router";
import { ConsoleContext } from "../context/consoleContext";
import storage from "../storage";
import { reducer } from "../store/console/reducer";
import { ConsoleState } from "../store/console/interfaces";
import { hideAchievement, setGame, setOverlay } from "../store/console/actions";

// how long the toast of a found secret stays on screen (TASK-97)
export const ACHIEVEMENT_TOAST_MS = 5000;

// lazy: storage is read once, not on every render
const createInitialState = (): ConsoleState => ({
  logs: [],
  nextLogId: 0,
  typedLogId: 0,
  // the commands of earlier visits too (TASK-61)
  history: storage.getHistory(),
  historyAdded: 0,
  typedCommandsCount: 0,
  caretMode: storage.getCaretMode(),
  crtMode: storage.getCrtMode(),
  soundMode: storage.getSoundMode(),
  fontMode: storage.getFontMode(),
  fontSize: storage.getFontSize(),
  commandsHint: [],
  overlay: null,
  game: null,
  achievement: null,
});

// the terminal session (logs, history, caret) lives above the pages, so a trip to the regular
// view and back doesn't wipe it
export const ConsoleSessionLayout: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, undefined, createInitialState);
  // the rain, a screensaver and a game belong to the page they were run on: leaving it without a
  // key or tap (the browser's back by a mouse button or a swipe) closes them. A change of the query
  // alone (a deep link dropping ?cmd before running `matrix`) is not leaving
  const { pathname } = useLocation();
  const pathnameRef = React.useRef(pathname);
  React.useLayoutEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    dispatch(setOverlay(null));
    dispatch(setGame(null));
  }, [pathname]);

  React.useEffect(() => {
    storage.setHistory(state.history);
  }, [state.history]);

  // the toast is hidden here, not by the page showing it: a page left meanwhile would keep it
  // for its return
  const achievementId = state.achievement?.id;
  React.useEffect(() => {
    if (achievementId === undefined) return;
    const timer = setTimeout(() => dispatch(hideAchievement(achievementId)), ACHIEVEMENT_TOAST_MS);
    return () => clearTimeout(timer);
  }, [achievementId]);

  const consoleContextValue = React.useMemo(
    () => ({ consoleState: state, consoleDispatch: dispatch }),
    [state],
  );

  return (
    <ConsoleContext.Provider value={consoleContextValue}>
      <Outlet />
    </ConsoleContext.Provider>
  );
};
