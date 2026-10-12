import { CaretMode, caretModes, oneOf, ThemeMode, themeModes } from "../domain";
import { Languages, languages } from "../localization/interfaces";
import { htmlLangByLanguage } from "../localization/utils";

enum StorageKeys {
  CaretMode = "caretMode",
  ThemeMode = "themeMode",
  language = "language",
}

// storage access can throw (blocked cookies, Safari private mode, quota):
// settings persistence is optional, so failures fall back silently
const readItem = (key: StorageKeys): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeItem = (key: StorageKeys, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore: the setting just won't survive a reload
  }
};

// returns the stored value only if it is one of the allowed ones
const readOneOf = <T extends string>(key: StorageKeys, allowed: readonly T[], fallback: T): T =>
  oneOf(allowed, readItem(key)) ?? fallback;

// the first supported language the browser prefers ("ru-RU" -> "ru", "en-GB" -> "eng"), else English
const getBrowserLanguage = (): Languages => {
  const preferred = navigator.languages.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const primary = tag.split("-")[0].toLowerCase();
    const language = languages.find((x) => htmlLangByLanguage[x] === primary);
    if (language) return language;
  }
  return "eng";
};

class Storage {
  setCaretMode = (mode: CaretMode) => {
    writeItem(StorageKeys.CaretMode, mode);
  };

  getCaretMode = (): CaretMode => readOneOf(StorageKeys.CaretMode, caretModes, CaretMode.Block);

  setThemeMode = (theme: ThemeMode) => {
    writeItem(StorageKeys.ThemeMode, theme);
  };

  getThemeMode = (): ThemeMode => readOneOf(StorageKeys.ThemeMode, themeModes, "Black");

  setLanguage = (language: Languages) => {
    writeItem(StorageKeys.language, language);
  };

  // until a language is set, the browser's one is used (and not stored, so it keeps following it)
  getLanguage = (): Languages =>
    oneOf(languages, readItem(StorageKeys.language)) ?? getBrowserLanguage();
}

export default new Storage();
