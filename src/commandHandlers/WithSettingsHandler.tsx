import React from "react";
import { CaretMode } from "../components/Char";
import { useAppContext } from "../context/appContext";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { addConsoleLog, setCaretMode } from "../store/console/actions";
import { setLanguage, setTheme } from "../store/app/actions";
import { themeModes, ThemeMode } from "../store/app/interfaces";
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
  ShowThemes = "show themes",
  SetCaret = "set caret",
  ShowCarets = "show carets",
  SetLanguage = "set language",
  ShowLanguages = "show languages",
}

const commandsWithParams: CommandWithParams[] = [
  { command: SettingsCommands.SetTheme, params: [...themeModes] },
  { command: SettingsCommands.ShowThemes },
  { command: SettingsCommands.SetCaret, params: Object.values(CaretMode) },
  { command: SettingsCommands.ShowCarets },
  { command: SettingsCommands.SetLanguage, params: Object.values(languages) },
  { command: SettingsCommands.ShowLanguages },
];

const WithSettingsHandler: React.FC<WithSettingsHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const { appDispatch } = useAppContext();

  const commandHandler = (userCommand: string) => {
    const separated = separateCommand(commandsWithParams, userCommand);
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
    if (SettingsCommands.ShowLanguages === command) {
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

      // the message must be taken from the new dictionary, so wait for it to load
      localization
        .changeDictionary(language)
        .then(() => {
          storage.setLanguage(language);
          appDispatch(setLanguage(language));
          consoleDispatch(
            addConsoleLog(
              localization.getLocale({ key: "changeLanguage", args: { languageName: language } }),
            ),
          );
        })
        .catch(() => {
          consoleDispatch(
            addConsoleLog(
              localization.getLocale({
                key: "changeLanguageError",
                args: { languageName: language },
              }),
            ),
          );
        });
      return true;
    }

    const themeListLocale = localization.getLocale({
      key: "themeList",
      args: { themes: getParamsString(themeModes) },
    });
    if (SettingsCommands.ShowThemes === command) {
      consoleDispatch(addConsoleLog(themeListLocale));
      return true;
    }

    if (SettingsCommands.SetTheme === command) {
      if (!params[0]) {
        consoleDispatch(addConsoleLog(themeListLocale));
        return true;
      }

      const theme = makeCapitalize(params[0]) as ThemeMode;

      if (!themeModes.includes(theme)) {
        consoleDispatch(
          addConsoleLog(localization.getLocale({ key: "wrongTheme", args: { themeName: theme } })),
        );
        return true;
      }

      storage.setThemeMode(theme);
      appDispatch(setTheme(theme));
      consoleDispatch(
        addConsoleLog(localization.getLocale({ key: "changeTheme", args: { themeName: theme } })),
      );
      return true;
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
