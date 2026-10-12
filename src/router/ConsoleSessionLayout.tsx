import React from "react";
import { Outlet } from "react-router";
import { ConsoleContext } from "../context/consoleContext";
import storage from "../storage";
import { reducer } from "../store/console/reducer";
import { ConsoleState } from "../store/console/interfaces";

// lazy: storage is read once, not on every render
const createInitialState = (): ConsoleState => ({
  logs: [],
  nextLogId: 0,
  typedLogId: 0,
  history: [],
  typedCommandsCount: 0,
  caretMode: storage.getCaretMode(),
  commandsHint: [],
});

// the terminal session (logs, history, caret) lives above the pages, so a trip to the regular
// view and back doesn't wipe it
export const ConsoleSessionLayout: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, undefined, createInitialState);
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
