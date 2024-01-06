import React from "react";
import { CaretMode } from "../components/Char";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { addConsoleLog, setCaretMode } from "../store/console/actions";
import { makeCapitalize } from "../utils";
import {
  CommandWithParams,
  getAllCommandsWithParams,
  getParamsString,
  separateCommand,
} from "./utils";
import localization from "../localization";
import { checkLanguage } from "../localization/utils";
import storage from "../storage";
import { usePathnameLocation } from "../hooks/usePathnameLocation";
import { languages } from "../localization/interfaces";

interface WithSettingsHandlerProps {
  children?: React.ReactNode;
}

enum SettingsComamnds {
  SetTheme = "set theme",
  SetCaret = "set caret",
  ShowCarets = "show carets",
  SetLanguage = "set language",
  ShowLanguages = "show languages",
}

const commandsWithParams: CommandWithParams[] = [
  { command: SettingsComamnds.SetTheme },
  { command: SettingsComamnds.SetCaret, params: Object.values(CaretMode) },
  { command: SettingsComamnds.ShowCarets },
  { command: SettingsComamnds.SetLanguage, params: Object.values(languages) },
  { command: SettingsComamnds.ShowLanguages },
];

const WithSettingsHandler: React.FC<WithSettingsHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const pathnameLocation = usePathnameLocation();

  const commandHandler = (userCommand: string) => {
    const separated = separateCommand(SettingsComamnds, userCommand);
    if (!separated) return false;
    const { command, params } = separated;

    const caretListLocale = localization.getLocale({
      key: "сaretList",
      args: { carets: getParamsString(CaretMode) },
    });
    if (SettingsComamnds.ShowCarets === command) {
      consoleDispatch(addConsoleLog(caretListLocale, pathnameLocation));
      return true;
    }

    if (SettingsComamnds.SetCaret === command) {
      if (!params[0]) {
        consoleDispatch(addConsoleLog(caretListLocale, pathnameLocation));
        return true;
      }

      const caretMode = makeCapitalize(params[0]) as keyof typeof CaretMode;

      if (!CaretMode[caretMode]) {
        consoleDispatch(
          addConsoleLog(
            localization.getLocale({ key: "wrongCaret", args: { caretName: caretMode } }),
            pathnameLocation,
          ),
        );
        return true;
      }

      storage.setCaretMode(CaretMode[caretMode]);
      consoleDispatch(setCaretMode(CaretMode[caretMode]));
      consoleDispatch(
        addConsoleLog(
          localization.getLocale({ key: "changeCaret", args: { caretName: caretMode } }),
          pathnameLocation,
        ),
      );
      return true;
    }

    const languageListLocale = localization.getLocale({
      key: "languageList",
      args: { languages: getParamsString(languages) },
    });
    if (SettingsComamnds.ShowCarets === command) {
      consoleDispatch(addConsoleLog(languageListLocale, pathnameLocation));
      return true;
    }

    if (SettingsComamnds.SetLanguage === command) {
      if (!params[0]) {
        consoleDispatch(addConsoleLog(languageListLocale, pathnameLocation));
        return true;
      }

      const language = checkLanguage(params[0].toLowerCase());

      if (!language) {
        consoleDispatch(
          addConsoleLog(
            localization.getLocale({ key: "wrongLanguage", args: { languageName: params[0] } }),
            pathnameLocation,
          ),
        );
        return true;
      }

      storage.setLanguage(language);
      localization.changeDictionary(language);
      consoleDispatch(
        addConsoleLog(
          localization.getLocale({ key: "changeLanguage", args: { languageName: language } }),
          pathnameLocation,
        ),
      );
      return true;
    }

    if (SettingsComamnds.SetTheme === command) {
      // TODO set theme
    }

    return false;
  };

  const allCommands = getAllCommandsWithParams(commandsWithParams);

  return (
    <HandlerContext.Provider value={{ commandHandler, allCommands }}>
      {children}
    </HandlerContext.Provider>
  );
};

export default WithSettingsHandler;
