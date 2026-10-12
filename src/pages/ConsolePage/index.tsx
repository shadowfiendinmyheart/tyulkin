import React from "react";
import { Navigate, useLocation } from "react-router";
import Console from "../../components/Console";
import DeepLinkCommand from "../../components/DeepLinkCommand";
import ViewSwitch from "../../components/ViewSwitch";
import WithCommandHandler from "../../commandHandlers/WithCommandHandler";
import { commandsByRoute } from "../../commandHandlers/commands";
import { useConsoleContext } from "../../context/consoleContext";
import { ROUTES } from "../../router/const";
import { addConsoleLog } from "../../store/console/actions";
import { withNode } from "../../store/console/logNodes";
import storage from "../../storage";
import { useLocalization } from "../../context/localizationContext";
import { useAppContext } from "../../context/appContext";
import { getNeofetch } from "../../commandHandlers/neofetch";
import { CommonDictionaryKeys, Languages, TFunction } from "../../localization/interfaces";
import { htmlLangByLanguage } from "../../localization/utils";
import { prefersReducedMotion } from "../../utils";

import styles from "./styles.module.scss";
import { ConsoleRouteValues } from "../../router/interfaces";

const welcomeLocaleByRoute: { [key in ConsoleRouteValues]: CommonDictionaryKeys } = {
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

// a visitor who has done nothing for this long is offered the regular view
export const GUI_HINT_DELAY_MS = 15_000;
// what counts as doing something: typing, clicking or tapping, scrolling the console
const ACTIVITY_EVENTS = ["keydown", "pointerdown", "wheel", "touchmove"] as const;

interface ConsolePageProps {
  route: ConsoleRouteValues;
}

const ConsolePage: React.FC<ConsolePageProps> = ({ route }) => {
  // the session state is kept by ConsoleSessionLayout, see router/routes.tsx
  const { consoleState: state, consoleDispatch: dispatch } = useConsoleContext();
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
  const welcomedRouteRef = React.useRef<ConsoleRouteValues | null>(null);
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
  }, [route, dispatch]);

  // the regular view is offered on the main page to a visitor who hasn't run a command and has
  // done nothing for a while (no key, click, tap or scrolling); once per session (storage.isGuiOffered)
  const hasCommands = state.history.length > 0;
  React.useEffect(() => {
    if (route !== ROUTES.MAIN || hasCommands || storage.isGuiOffered()) return;
    let timer: ReturnType<typeof setTimeout>;
    const offerGui = () => {
      storage.setGuiOffered();
      const { t } = welcomeParamsRef.current.localization;
      dispatch(
        addConsoleLog(
          withNode(
            (command) => t({ key: "guiHint", args: { command, link: t({ key: "switchToGui" }) } }),
            { type: "command", command: "gui" },
          ),
        ),
      );
    };
    // activity only moves the timestamp (scrolling fires many events); the timer re-checks it
    let lastActivity = Date.now();
    const markActivity = () => {
      lastActivity = Date.now();
    };
    const checkIdle = () => {
      const idleMs = Date.now() - lastActivity;
      if (idleMs >= GUI_HINT_DELAY_MS) offerGui();
      else timer = setTimeout(checkIdle, GUI_HINT_DELAY_MS - idleMs);
    };
    timer = setTimeout(checkIdle, GUI_HINT_DELAY_MS);
    const options = { capture: true, passive: true };
    ACTIVITY_EVENTS.forEach((type) => document.addEventListener(type, markActivity, options));
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((type) => document.removeEventListener(type, markActivity, options));
    };
  }, [route, hasCommands, dispatch]);

  // "/settings/" and "/Settings" match this route too: switch to the canonical path,
  // so the prompt, history and `back` see the same path the commands were picked for
  if (pathname !== route) {
    return <Navigate to={{ pathname: route, search, hash }} state={locationState} replace />;
  }

  return (
    <WithCommandHandler commands={commandsByRoute[route]}>
      <nav className={styles.toolbar}>
        <ViewSwitch to="gui" />
      </nav>
      <div className={styles.wrapper}>
        <Console />
      </div>
      <DeepLinkCommand />
    </WithCommandHandler>
  );
};

export default ConsolePage;
