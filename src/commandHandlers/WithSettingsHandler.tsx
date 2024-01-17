import React from "react";
import { CaretMode } from "../components/Char";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { addConsoleLog, setCaretMode } from "../store/console/actions";
import { makeCapitalize } from "../utils";
import { getAllCommandsWithParams, getParamsString, separateCommand } from "./utils";
import localization from "../localization";
import { checkLanguage } from "../localization/utils";
import storage from "../storage";
import { languages } from "../localization/interfaces";
import { CommandWithParams } from "./interfaces";

interface WithSettingsHandlerProps {
  children?: React.ReactNode;
}

export enum SettingsCommands {
  SetTheme = "set theme",
  SetCaret = "set caret",
  ShowCarets = "show carets",
  SetLanguage = "set language",
  ShowLanguages = "show languages",
}

const commandsWithParams: CommandWithParams[] = [
  { command: SettingsCommands.SetTheme },
  { command: SettingsCommands.SetCaret, params: Object.values(CaretMode) },
  { command: SettingsCommands.ShowCarets },
  { command: SettingsCommands.SetLanguage, params: Object.values(languages) },
  { command: SettingsCommands.ShowLanguages },
];

const WithSettingsHandler: React.FC<WithSettingsHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();

  const commandHandler = (userCommand: string) => {
    const separated = separateCommand(SettingsCommands, userCommand);
    if (!separated) return false;
    const { command, params } = separated;

    const caretListLocale = localization.getLocale({
      key: "caretList",
      args: { carets: getParamsString(CaretMode) },
    });
    if (SettingsCommands.ShowCarets === command) {
      consoleDispatch(addConsoleLog(caretListLocale));
      return true;
    }

    if (SettingsCommands.SetCaret === command) {
      if (!params[0]) {
        consoleDispatch(addConsoleLog(caretListLocale));
        return true;
      }

      const caretMode = makeCapitalize(params[0]) as keyof typeof CaretMode;

      if (!CaretMode[caretMode]) {
        consoleDispatch(
          addConsoleLog(
            localization.getLocale({ key: "wrongCaret", args: { caretName: caretMode } }),
          ),
        );
        return true;
      }

      storage.setCaretMode(CaretMode[caretMode]);
      consoleDispatch(setCaretMode(CaretMode[caretMode]));
      consoleDispatch(
        addConsoleLog(
          localization.getLocale({ key: "changeCaret", args: { caretName: caretMode } }),
        ),
      );
      return true;
    }

    const languageListLocale = localization.getLocale({
      key: "languageList",
      args: { languages: getParamsString(languages) },
    });
    if (SettingsCommands.ShowCarets === command) {
      consoleDispatch(addConsoleLog(languageListLocale));
      return true;
    }

    if (SettingsCommands.SetLanguage === command) {
      if (!params[0]) {
        consoleDispatch(addConsoleLog(languageListLocale));
        return true;
      }

      const language = checkLanguage(params[0].toLowerCase());

      if (!language) {
        consoleDispatch(
          addConsoleLog(
            localization.getLocale({ key: "wrongLanguage", args: { languageName: params[0] } }),
          ),
        );
        return true;
      }

      storage.setLanguage(language);
      localization.changeDictionary(language);
      consoleDispatch(
        addConsoleLog(
          localization.getLocale({ key: "changeLanguage", args: { languageName: language } }),
        ),
      );
      return true;
    }

    if (SettingsCommands.SetTheme === command) {
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
