import React from "react";
import { CaretMode } from "../components/Caret";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { addConsoleLog, setCaretMode } from "../store/console/actions";
import { makeCapitalize } from "../utils";
import { separateCommand } from "./utils";
import localization from "../localization";
import { isLanguage } from "../localization/utils";
import storage from "../storage";

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

  const commandHandler = (userCommand: string) => {
    const separated = separateCommand(SettingsComamnds, userCommand);
    if (!separated) return false;
    const { command, params } = separated;

    if (command === SettingsComamnds.SetCaret) {
      const caretModeParam = makeCapitalize(params[0]) as keyof typeof CaretMode;

      if (params.length !== 1 || !CaretMode[caretModeParam]) {
        // TODO: make error handler
        consoleDispatch(addConsoleLog("wrong caret params"));
        return true;
      }

      storage.setCaretMode(CaretMode[caretModeParam]);
      consoleDispatch(setCaretMode(CaretMode[caretModeParam]));
      consoleDispatch(addConsoleLog(`ur caret successfull changed to ${caretModeParam} mode`));
      return true;
    }

    if (command === SettingsComamnds.SetLocale) {
      const languageParam = params[0].toLowerCase();

      if (params.length !== 1 || !isLanguage(languageParam)) {
        // TODO: make error handler
        consoleDispatch(addConsoleLog("wrong language params"));
        return true;
      }

      storage.setLanguage(languageParam);
      localization.changeDictionary(languageParam);
      consoleDispatch(addConsoleLog(`ur language switch to ${languageParam}`));
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
