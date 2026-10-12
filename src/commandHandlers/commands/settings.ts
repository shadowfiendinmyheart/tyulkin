import { CaretMode, caretModes, CrtMode, crtModes, oneOf, themeModes } from "../../domain";
import { languages, TFunction } from "../../localization/interfaces";
import { checkLanguage } from "../../localization/utils";
import storage from "../../storage";
import { setTheme } from "../../store/app/actions";
import { setCaretMode, setCrtMode } from "../../store/console/actions";
import { makeCapitalize } from "../../utils";
import { Command } from "../interfaces";
import { getParamsString } from "../utils";

const getCaretListLocale = (t: TFunction) =>
  t({ key: "caretList", args: { carets: getParamsString(CaretMode) } });

const getLanguageListLocale = (t: TFunction) =>
  t({ key: "languageList", args: { languages: getParamsString(languages) } });

const getThemeListLocale = (t: TFunction) =>
  t({ key: "themeList", args: { themes: getParamsString(themeModes) } });

const CRT_MODES = getParamsString(crtModes);

// the state in words of the language: "on" / "включён"
const getCrtStateLocale = (t: TFunction, mode: CrtMode) =>
  t({ key: mode === "on" ? "crtOn" : "crtOff" });

export const settingsCommands: Command[] = [
  {
    name: "set theme",
    params: themeModes,
    descriptionKey: "helpSetTheme",
    run: ({ log, t, appDispatch }, [param]) => {
      if (!param) {
        log(getThemeListLocale(t));
        return;
      }

      const themeName = makeCapitalize(param);
      // the secret theme is not settable: only the Konami code unlocks it
      const theme = oneOf(themeModes, themeName);

      if (!theme) {
        log(t({ key: "wrongTheme", args: { themeName } }));
        return;
      }

      storage.setThemeMode(theme);
      appDispatch(setTheme(theme));
      log(t({ key: "changeTheme", args: { themeName: theme } }));
    },
  },
  {
    name: "show themes",
    descriptionKey: "helpShowThemes",
    run: ({ log, t }) => log(getThemeListLocale(t)),
  },
  {
    name: "set caret",
    params: caretModes,
    descriptionKey: "helpSetCaret",
    run: ({ log, t, consoleDispatch }, [param]) => {
      if (!param) {
        log(getCaretListLocale(t));
        return;
      }

      const caretMode = makeCapitalize(param) as keyof typeof CaretMode;

      if (!CaretMode[caretMode]) {
        log(t({ key: "wrongCaret", args: { caretName: caretMode } }));
        return;
      }

      storage.setCaretMode(CaretMode[caretMode]);
      consoleDispatch(setCaretMode(CaretMode[caretMode]));
      log(t({ key: "changeCaret", args: { caretName: caretMode } }));
    },
  },
  {
    name: "show carets",
    descriptionKey: "helpShowCarets",
    run: ({ log, t }) => log(getCaretListLocale(t)),
  },
  {
    name: "set crt",
    params: crtModes,
    descriptionKey: "helpSetCrt",
    run: ({ log, t, crtMode, consoleDispatch }, [param]) => {
      if (!param) {
        log(
          t({ key: "crtStatus", args: { state: getCrtStateLocale(t, crtMode), modes: CRT_MODES } }),
        );
        return;
      }

      const mode = oneOf(crtModes, param.toLowerCase());

      if (!mode) {
        log(t({ key: "wrongCrt", args: { crtName: param, modes: CRT_MODES } }));
        return;
      }

      storage.setCrtMode(mode);
      consoleDispatch(setCrtMode(mode));
      log(t({ key: "changeCrt", args: { state: getCrtStateLocale(t, mode) } }));
    },
  },
  {
    name: "set language",
    params: languages,
    descriptionKey: "helpSetLanguage",
    run: ({ log, t, changeLanguage }, [param]) => {
      if (!param) {
        log(getLanguageListLocale(t));
        return;
      }

      const language = checkLanguage(param.toLowerCase());

      if (!language) {
        log(t({ key: "wrongLanguage", args: { languageName: param } }));
        return;
      }

      // the message must be taken from the new dictionary, so wait for it to load
      changeLanguage(language)
        .then((newT) => {
          log(newT({ key: "changeLanguage", args: { languageName: language } }));
        })
        .catch(() => {
          log(t({ key: "changeLanguageError", args: { languageName: language } }));
        });
    },
  },
  {
    name: "show languages",
    descriptionKey: "helpShowLanguages",
    run: ({ log, t }) => log(getLanguageListLocale(t)),
  },
];
