import {
  CaretMode,
  caretModes,
  CrtMode,
  crtModes,
  oneOf,
  SoundMode,
  RANDOM_THEME,
  soundModes,
  ThemeMode,
  themeModes,
} from "../../domain";
import { languages, TFunction } from "../../localization/interfaces";
import { checkLanguage } from "../../localization/utils";
import storage from "../../storage";
import { setTheme } from "../../store/app/actions";
import { setCaretMode, setCrtMode, setSoundMode } from "../../store/console/actions";
import { makeCapitalize } from "../../utils";
import { suspendKeySound } from "../../utils/keySound";
import { Command } from "../interfaces";
import { getParamsString } from "../utils";

const getCaretListLocale = (t: TFunction) =>
  t({ key: "caretList", args: { carets: getParamsString(CaretMode) } });

const getLanguageListLocale = (t: TFunction) =>
  t({ key: "languageList", args: { languages: getParamsString(languages) } });

const getThemeListLocale = (t: TFunction) =>
  t({ key: "themeList", args: { themes: getParamsString(themeModes) } });

// any listed theme but the current one: the command always changes something
const getRandomTheme = (current: ThemeMode): ThemeMode => {
  const others = themeModes.filter((theme) => theme !== current);
  return others[Math.floor(Math.random() * others.length)];
};

const CRT_MODES = getParamsString(crtModes);

// the state in words of the language: "on" / "включён"
const getStateLocale = (t: TFunction, mode: CrtMode | SoundMode) =>
  t({ key: mode === "on" ? "stateOn" : "stateOff" });

const SOUND_MODES = getParamsString(soundModes);

export const settingsCommands: Command[] = [
  {
    name: "set theme",
    params: [...themeModes, RANDOM_THEME],
    descriptionKey: "helpSetTheme",
    run: ({ log, t, theme: currentTheme, appDispatch }, [param]) => {
      if (!param) {
        log(getThemeListLocale(t));
        return;
      }

      const themeName = makeCapitalize(param);
      // the secret theme is not settable: only the Konami code unlocks it
      const theme =
        param.toLowerCase() === RANDOM_THEME
          ? getRandomTheme(currentTheme)
          : oneOf(themeModes, themeName);

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
        log(t({ key: "crtStatus", args: { state: getStateLocale(t, crtMode), modes: CRT_MODES } }));
        return;
      }

      const mode = oneOf(crtModes, param.toLowerCase());

      if (!mode) {
        log(t({ key: "wrongCrt", args: { crtName: param, modes: CRT_MODES } }));
        return;
      }

      storage.setCrtMode(mode);
      consoleDispatch(setCrtMode(mode));
      log(t({ key: "changeCrt", args: { state: getStateLocale(t, mode) } }));
    },
  },
  {
    name: "set sound",
    params: soundModes,
    descriptionKey: "helpSetSound",
    run: ({ log, t, soundMode, consoleDispatch }, [param]) => {
      if (!param) {
        log(
          t({
            key: "soundStatus",
            args: { state: getStateLocale(t, soundMode), modes: SOUND_MODES },
          }),
        );
        return;
      }

      const mode = oneOf(soundModes, param.toLowerCase());

      if (!mode) {
        log(t({ key: "wrongSound", args: { soundName: param, modes: SOUND_MODES } }));
        return;
      }

      storage.setSoundMode(mode);
      consoleDispatch(setSoundMode(mode));
      if (mode === "off") suspendKeySound();
      log(t({ key: "changeSound", args: { state: getStateLocale(t, mode) } }));
    },
  },
  {
    name: "set language",
    params: languages,
    descriptionKey: "helpSetLanguage",
    run: ({ log, fail, t, changeLanguage }, [param]) => {
      if (!param) {
        log(getLanguageListLocale(t));
        return;
      }

      const language = checkLanguage(param.toLowerCase());

      if (!language) {
        log(t({ key: "wrongLanguage", args: { languageName: param } }));
        fail();
        return;
      }

      // the message must be taken from the new dictionary, so wait for it to load
      changeLanguage(language)
        .then((newT) => {
          log(newT({ key: "changeLanguage", args: { languageName: language } }));
        })
        .catch(() => {
          log(t({ key: "changeLanguageError", args: { languageName: language } }));
          fail();
        });
    },
  },
  {
    name: "show languages",
    descriptionKey: "helpShowLanguages",
    run: ({ log, t }) => log(getLanguageListLocale(t)),
  },
];
