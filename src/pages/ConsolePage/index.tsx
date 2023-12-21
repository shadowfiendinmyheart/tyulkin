import React from "react";
import { useLocation } from "react-router-dom";
import Console from "../../components/Console";
import WithEducationHandler from "../../commandHandlers/WithEducationHandler";
import WithSettingsHandler from "../../commandHandlers/WithSettingsHandler";
import WithGlobalHandler from "../../commandHandlers/WithGlobalHandler";
import WithMainHandler from "../../commandHandlers/WithMainHandler";
import { ConsoleContext } from "../../context/consoleContext";
import { ROUTES } from "../../router/const";
import { RoutesValues } from "../../router/interfaces";
import { reducer } from "../../store/console/reducer";
import storage from "../../storage";
import { useAppContext } from "../../context/appContext";
import { addConsoleLog } from "../../store/console/actions";
import localization from "../../localization";
import { DictionaryKeys } from "../../localization/interfaces";
import styles from "./styles.module.scss";

const handlerByRoute = {
  [ROUTES.MAIN]: WithMainHandler,
  [ROUTES.EDUCATION]: WithEducationHandler,
  [ROUTES.SETTINGS]: WithSettingsHandler,
};

const welcomeLocaleByRoute: { [key in RoutesValues]: DictionaryKeys } = {
  [ROUTES.MAIN]: "welcome",
  [ROUTES.EDUCATION]: "welcome",
  [ROUTES.SETTINGS]: "settingsWelcome",
};

const ConsolePage: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    logs: [],
    userCommands: [],
    caretMode: storage.getCaretMode(),
  });
  const pathname = useLocation().pathname as RoutesValues;
  const { appState } = useAppContext();
  const appStatus = appState.status;

  // welcome text
  React.useEffect(() => {
    if (appStatus !== "ok") return;

    dispatch(addConsoleLog(localization.getLocale({ key: welcomeLocaleByRoute[pathname] })));
  }, [appStatus]);

  // preview page text
  React.useEffect(() => {
    if (appStatus !== "ok") return;

    dispatch(addConsoleLog(localization.getLocale({ key: welcomeLocaleByRoute[pathname] })));
  }, [pathname]);

  const WithPageHandler: React.FC<{ children: React.ReactNode }> = handlerByRoute[pathname];

  // TODO: make loader for "init/loading" console status
  return appStatus === "loading" ? (
    <div>loading</div>
  ) : (
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
