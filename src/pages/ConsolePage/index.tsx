import React from "react";
import { useLocation } from "react-router-dom";
import Console from "../../components/Console";
import WithSettingsHandler from "../../commandHandlers/WithSettingsHandler";
import WithGlobalHandler from "../../commandHandlers/WithGlobalHandler";
import WithMainHandler from "../../commandHandlers/WithMainHandler";
import { ConsoleContext } from "../../context/consoleContext";
import { ROUTES } from "../../router/const";
import { RoutesValues } from "../../router/interfaces";
import { reducer } from "../../store/console/reducer";
import { addConsoleLog } from "../../store/console/actions";
import storage from "../../storage";
import localization from "../../localization";
import { CommonDictionaryKeys } from "../../localization/interfaces";
import { usePathnameLocation } from "../../hooks/usePathnameLocation";

import styles from "./styles.module.scss";

const handlerByRoute = {
  [ROUTES.MAIN]: WithMainHandler,
  [ROUTES.SETTINGS]: WithSettingsHandler,
};

const welcomeLocaleByRoute: { [key in RoutesValues]: CommonDictionaryKeys } = {
  [ROUTES.MAIN]: "welcome",
  [ROUTES.SETTINGS]: "settingsWelcome",
};

const ConsolePage: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    logs: [],
    userCommands: [],
    caretMode: storage.getCaretMode(),
    commandsHint: [],
  });
  const pathname = useLocation().pathname as RoutesValues;
  const pathnameLocation = usePathnameLocation();

  // welcome text
  React.useEffect(() => {
    dispatch(
      addConsoleLog(
        localization.getLocale({ key: welcomeLocaleByRoute[pathname] }),
        pathnameLocation,
      ),
    );
  }, [pathname]);

  const WithPageHandler: React.FC<{ children: React.ReactNode }> = handlerByRoute[pathname];

  return (
    <ConsoleContext.Provider
      value={{
        consoleState: state,
        consoleDispatch: dispatch,
      }}
    >
      <WithGlobalHandler>
        <WithPageHandler>
          <div className={styles.wrapper}>
            <Console />
          </div>
        </WithPageHandler>
      </WithGlobalHandler>
    </ConsoleContext.Provider>
  );
};

export default ConsolePage;
