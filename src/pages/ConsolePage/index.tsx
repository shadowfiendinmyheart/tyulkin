import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import Console from "../../components/Console";
import WithCommandHandler from "../../commandHandlers/WithCommandHandler";
import { commandsByRoute } from "../../commandHandlers/commands";
import { ConsoleContext } from "../../context/consoleContext";
import { ROUTES } from "../../router/const";
import { reducer } from "../../store/console/reducer";
import { addConsoleLog } from "../../store/console/actions";
import storage from "../../storage";
import { useT } from "../../context/localizationContext";
import { CommonDictionaryKeys } from "../../localization/interfaces";

import styles from "./styles.module.scss";
import { RouteValues } from "../../router/interfaces";

const welcomeLocaleByRoute: { [key in RouteValues]: CommonDictionaryKeys } = {
  [ROUTES.MAIN]: "welcome",
  [ROUTES.SETTINGS]: "settingsWelcome",
};

interface ConsolePageProps {
  route: RouteValues;
}

const ConsolePage: React.FC<ConsolePageProps> = ({ route }) => {
  const [state, dispatch] = React.useReducer(reducer, {
    logs: [],
    history: [],
    caretMode: storage.getCaretMode(),
    commandsHint: [],
  });
  const { pathname, search, hash, state: locationState } = useLocation();
  const t = useT();
  // welcome text is logged on navigation only, not again after a language change
  const tRef = React.useRef(t);
  React.useLayoutEffect(() => {
    tRef.current = t;
  }, [t]);

  // welcome text
  React.useEffect(() => {
    dispatch(addConsoleLog(tRef.current({ key: welcomeLocaleByRoute[route] })));
  }, [route]);

  // "/settings/" and "/Settings" match this route too: switch to the canonical path,
  // so the prompt, history and `back` see the same path the commands were picked for
  if (pathname !== route) {
    return <Navigate to={{ pathname: route, search, hash }} state={locationState} replace />;
  }

  return (
    <ConsoleContext.Provider
      value={{
        consoleState: state,
        consoleDispatch: dispatch,
      }}
    >
      <WithCommandHandler commands={commandsByRoute[route]}>
        <div className={styles.wrapper}>
          <Console />
        </div>
      </WithCommandHandler>
    </ConsoleContext.Provider>
  );
};

export default ConsolePage;
