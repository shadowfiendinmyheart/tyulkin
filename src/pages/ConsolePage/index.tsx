import React from "react";
import { useLocation } from "react-router-dom";
import Console from "../../components/Console";
import WithGlobalHandler from "../../commandHandlers/WithGlobalHandler";
import { ConsoleContext } from "../../context/consoleContext";
import { ROUTES } from "../../router/const";
import { reducer } from "../../store/console/reducer";
import { addConsoleLog } from "../../store/console/actions";
import storage from "../../storage";
import localization from "../../localization";
import { CommonDictionaryKeys } from "../../localization/interfaces";

import styles from "./styles.module.scss";
import { handlerByRoute } from "../../commandHandlers/utils";
import { RouteValues } from "../../router/interfaces";

const welcomeLocaleByRoute: { [key in RouteValues]: CommonDictionaryKeys } = {
  [ROUTES.MAIN]: "welcome",
  [ROUTES.SETTINGS]: "settingsWelcome",
};

const ConsolePage: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    logs: [],
    history: [],
    caretMode: storage.getCaretMode(),
    commandsHint: [],
  });
  const pathname = useLocation().pathname as RouteValues;

  // welcome text
  React.useEffect(() => {
    dispatch(addConsoleLog(localization.getLocale({ key: welcomeLocaleByRoute[pathname] })));
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
