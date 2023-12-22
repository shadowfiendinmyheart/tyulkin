import React from "react";
import { CaretMode } from "../components/Caret";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { addConsoleLog, setCaretMode } from "../store/console/actions";
import { makeCapitalize } from "../utils";
import { separateCommand } from "./utils";
import localization from "../localization";
import { checkLanguage } from "../localization/utils";
import storage from "../storage";
import { usePathnameLocation } from "../hooks/usePathnameLocation";

interface WithSettingsHandlerProps {
  children?: React.ReactNode;
}

enum SettingsComamnds {
  SetTheme = "set theme",
  SetCaret = "set caret",
  SetLocale = "set locale",
}

const WithSettingsHandler: React.FC<WithSettingsHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const pathnameLocation = usePathnameLocation();

  console.log("wqqqqqq", pathnameLocation);

  const commandHandler = (userCommand: string) => {
    const separated = separateCommand(SettingsComamnds, userCommand);
    if (!separated) return false;
    const { command, params } = separated;

    if (command === SettingsComamnds.SetCaret) {
      const caretMode = makeCapitalize(params[0]) as keyof typeof CaretMode;

      if (params.length !== 1 || !CaretMode[caretMode]) {
        // TODO: make error handler + localization
        consoleDispatch(addConsoleLog("wrong caret", pathnameLocation));
        return true;
      }

      storage.setCaretMode(CaretMode[caretMode]);
      consoleDispatch(setCaretMode(CaretMode[caretMode]));
      consoleDispatch(
        addConsoleLog(`ur caret successfull changed to ${caretMode} mode`, pathnameLocation),
      );
      return true;
    }

    if (command === SettingsComamnds.SetLocale) {
      const language = checkLanguage(params[0].toLowerCase());

      if (params.length !== 1 || !language) {
        // TODO: make error handler + localization
        consoleDispatch(addConsoleLog("wrong language", pathnameLocation));
        return true;
      }

      storage.setLanguage(language);
      localization.changeDictionary(language);
      consoleDispatch(addConsoleLog(`ur language switch to ${language}`, pathnameLocation));
      return true;
    }

    if (command === SettingsComamnds.SetTheme) {
      // TODO set theme
    }

    return false;
  };

  return <HandlerContext.Provider value={{ commandHandler }}>{children}</HandlerContext.Provider>;
};

export default WithSettingsHandler;
