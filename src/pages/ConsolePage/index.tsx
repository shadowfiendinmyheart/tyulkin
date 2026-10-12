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
import { useLocalization } from "../../context/localizationContext";
import { useAppContext } from "../../context/appContext";
import { getNeofetch } from "../../commandHandlers/neofetch";
import { CommonDictionaryKeys, Languages, TFunction } from "../../localization/interfaces";
import { htmlLangByLanguage } from "../../localization/utils";
import { prefersReducedMotion } from "../../utils";

import styles from "./styles.module.scss";
import { RouteValues } from "../../router/interfaces";

const welcomeLocaleByRoute: { [key in RouteValues]: CommonDictionaryKeys } = {
  [ROUTES.MAIN]: "welcome",
  [ROUTES.SETTINGS]: "settingsWelcome",
};

// imitation of an ssh login, typed out before the first welcome of the session;
// "Last login" is left out on the first visit, as in ssh
const getBootLogs = (t: TFunction, language: Languages, lastLogin: Date | null) => {
  const lastLoginLines = lastLogin
    ? [
        t({
          key: "bootLastLogin",
          args: {
            date: lastLogin.toLocaleString(htmlLangByLanguage[language], {
              dateStyle: "medium",
              timeStyle: "medium",
            }),
          },
        }),
      ]
    : [];
  const lines = [...lastLoginLines, ...t({ key: "bootLines" }).split("\n")];
  // a log per line: each one is typed out after the previous
  return lines.map((text) => addConsoleLog({ type: "text", text, color: "muted" }));
};

// on the first welcome of a session (browser tab) remembers the visit and returns the previous
// one (null on the first visit); undefined when the session has already started
const startSession = (): { lastLogin: Date | null } | undefined => {
  if (storage.isSessionStarted()) return undefined;
  storage.setSessionStarted();
  const lastLogin = storage.getLastLogin();
  storage.setLastLogin(new Date());
  return { lastLogin };
};

// lazy: storage is read once, not on every render
const createInitialState = (): ConsoleState => ({
  logs: [],
  nextLogId: 0,
  typedLogId: 0,
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
  const localization = useLocalization();
  const { theme } = useAppContext().appState;
  // welcome text is logged on navigation only, not again after a language, theme or caret change
  const { caretMode } = state;
  const welcomeParamsRef = React.useRef({ localization, theme, caretMode });
  React.useLayoutEffect(() => {
    welcomeParamsRef.current = { localization, theme, caretMode };
  }, [localization, theme, caretMode]);

  // welcome text; StrictMode re-runs effects on mount, so the route that was already
  // welcomed is remembered (refs survive the remount) to log it once
  const welcomedRouteRef = React.useRef<RouteValues | null>(null);
  React.useEffect(() => {
    if (welcomedRouteRef.current === route) return;
    welcomedRouteRef.current = route;
    const { localization, theme, caretMode } = welcomeParamsRef.current;
    const { t, language } = localization;
    // the boot plays once per session; with reduced motion the welcome comes at once
    const session = startSession();
    if (session && !prefersReducedMotion())
      getBootLogs(t, language, session.lastLogin).forEach((action) => dispatch(action));
    // the main page greets with neofetch (TASK-54)
    if (route === ROUTES.MAIN)
      dispatch(addConsoleLog(getNeofetch({ t, language, theme, caretMode, now: new Date() })));
    dispatch(addConsoleLog(t({ key: welcomeLocaleByRoute[route] })));
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
