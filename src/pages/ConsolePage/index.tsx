import React from "react";
import { Navigate, useLocation } from "react-router";
import Console from "../../components/Console";
import WithCommandHandler from "../../commandHandlers/WithCommandHandler";
import { commandsByRoute } from "../../commandHandlers/commands";
import { ConsoleContext } from "../../context/consoleContext";
import { ROUTES } from "../../router/const";
import { reducer } from "../../store/console/reducer";
import { addConsoleLog } from "../../store/console/actions";
import { ConsoleState } from "../../store/console/interfaces";
import storage from "../../storage";
import { useT } from "../../context/localizationContext";
import { CommonDictionaryKeys } from "../../localization/interfaces";

import styles from "./styles.module.scss";
import { RouteValues } from "../../router/interfaces";

const welcomeLocaleByRoute: { [key in RouteValues]: CommonDictionaryKeys } = {
  [ROUTES.MAIN]: "welcome",
  [ROUTES.SETTINGS]: "settingsWelcome",
};

// lazy: storage is read once, not on every render
const createInitialState = (): ConsoleState => ({
  logs: [],
  nextLogId: 0,
  history: [],
  caretMode: storage.getCaretMode(),
  commandsHint: [],
});

interface ConsolePageProps {
  route: RouteValues;
}

const ConsolePage: React.FC<ConsolePageProps> = ({ route }) => {
  const [state, dispatch] = React.useReducer(reducer, undefined, createInitialState);
  const { pathname, search, hash, state: locationState } = useLocation();
  const t = useT();
  // welcome text is logged on navigation only, not again after a language change
  const tRef = React.useRef(t);
  React.useLayoutEffect(() => {
    tRef.current = t;
  }, [t]);

  // welcome text; StrictMode re-runs effects on mount, so the route that was already
  // welcomed is remembered (refs survive the remount) to log it once
  const welcomedRouteRef = React.useRef<RouteValues | null>(null);
  React.useEffect(() => {
    if (welcomedRouteRef.current === route) return;
    welcomedRouteRef.current = route;
    dispatch(addConsoleLog(tRef.current({ key: welcomeLocaleByRoute[route] })));
  }, [route]);

  const consoleContextValue = React.useMemo(
    () => ({ consoleState: state, consoleDispatch: dispatch }),
    [state],
  );

  // "/settings/" and "/Settings" match this route too: switch to the canonical path,
  // so the prompt, history and `back` see the same path the commands were picked for
  if (pathname !== route) {
    return <Navigate to={{ pathname: route, search, hash }} state={locationState} replace />;
  }

  return (
    <ConsoleContext.Provider value={consoleContextValue}>
      <WithCommandHandler commands={commandsByRoute[route]}>
        <div className={styles.wrapper}>
          <Console />
        </div>
      </WithCommandHandler>
    </ConsoleContext.Provider>
  );
};

export default ConsolePage;
