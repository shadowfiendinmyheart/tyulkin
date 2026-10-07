import { CaretMode } from "../../components/Char";
import localization from "../../localization";
import { languages } from "../../localization/interfaces";
import { checkLanguage } from "../../localization/utils";
import storage from "../../storage";
import { setLanguage, setTheme } from "../../store/app/actions";
import { ThemeMode, themeModes } from "../../store/app/interfaces";
import { setCaretMode } from "../../store/console/actions";
import { makeCapitalize } from "../../utils";
import { Command } from "../interfaces";
import { getParamsString } from "../utils";

const getCaretListLocale = () =>
  localization.getLocale({ key: "caretList", args: { carets: getParamsString(CaretMode) } });

const getLanguageListLocale = () =>
  localization.getLocale({ key: "languageList", args: { languages: getParamsString(languages) } });

const getThemeListLocale = () =>
  localization.getLocale({ key: "themeList", args: { themes: getParamsString(themeModes) } });

export const settingsCommands: Command[] = [
  {
    name: "set theme",
    params: themeModes,
    descriptionKey: "helpSetTheme",
    run: ({ log, appDispatch }, [param]) => {
      if (!param) {
        log(getThemeListLocale());
        return;
      }

      const theme = makeCapitalize(param) as ThemeMode;

      if (!themeModes.includes(theme)) {
        log(localization.getLocale({ key: "wrongTheme", args: { themeName: theme } }));
        return;
      }

      storage.setThemeMode(theme);
      appDispatch(setTheme(theme));
      log(localization.getLocale({ key: "changeTheme", args: { themeName: theme } }));
    },
  },
  {
    name: "show themes",
    descriptionKey: "helpShowThemes",
    run: ({ log }) => log(getThemeListLocale()),
  },
  {
    name: "set caret",
    params: Object.values(CaretMode),
    descriptionKey: "helpSetCaret",
    run: ({ log, consoleDispatch }, [param]) => {
      if (!param) {
        log(getCaretListLocale());
        return;
      }

      const caretMode = makeCapitalize(param) as keyof typeof CaretMode;

      if (!CaretMode[caretMode]) {
        log(localization.getLocale({ key: "wrongCaret", args: { caretName: caretMode } }));
        return;
      }

      storage.setCaretMode(CaretMode[caretMode]);
      consoleDispatch(setCaretMode(CaretMode[caretMode]));
      log(localization.getLocale({ key: "changeCaret", args: { caretName: caretMode } }));
    },
  },
  {
    name: "show carets",
    descriptionKey: "helpShowCarets",
    run: ({ log }) => log(getCaretListLocale()),
  },
  {
    name: "set language",
    params: languages,
    descriptionKey: "helpSetLanguage",
    run: ({ log, appDispatch }, [param]) => {
      if (!param) {
        log(getLanguageListLocale());
        return;
      }

      const language = checkLanguage(param.toLowerCase());

      if (!language) {
        log(localization.getLocale({ key: "wrongLanguage", args: { languageName: param } }));
        return;
      }

      // the message must be taken from the new dictionary, so wait for it to load
      localization
        .changeDictionary(language)
        .then(() => {
          storage.setLanguage(language);
          appDispatch(setLanguage(language));
          log(localization.getLocale({ key: "changeLanguage", args: { languageName: language } }));
        })
        .catch(() => {
          log(
            localization.getLocale({
              key: "changeLanguageError",
              args: { languageName: language },
            }),
          );
        });
    },
  },
  {
    name: "show languages",
    descriptionKey: "helpShowLanguages",
    run: ({ log }) => log(getLanguageListLocale()),
  },
];
