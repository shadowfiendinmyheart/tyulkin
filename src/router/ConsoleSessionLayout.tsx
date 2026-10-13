import React from "react";
import { Outlet, useLocation } from "react-router";
import { ConsoleContext } from "../context/consoleContext";
import storage from "../storage";
import { reducer } from "../store/console/reducer";
import { ConsoleState } from "../store/console/interfaces";
import { setMatrixShown } from "../store/console/actions";

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
  commandsHint: [],
  isMatrixShown: false,
});

// the terminal session (logs, history, caret) lives above the pages, so a trip to the regular
// view and back doesn't wipe it
export const ConsoleSessionLayout: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, undefined, createInitialState);
  // the rain belongs to the page it was run on: leaving it without a key or tap (the browser's
  // back by a mouse button or a swipe) closes it. A change of the query alone (a deep link
  // dropping ?cmd before running `matrix`) is not leaving
  const { pathname } = useLocation();
  const pathnameRef = React.useRef(pathname);
  React.useLayoutEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    dispatch(setMatrixShown(false));
  }, [pathname]);

  React.useEffect(() => {
    storage.setHistory(state.history);
  }, [state.history]);

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
