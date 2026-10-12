import { CaretMode, caretModes, oneOf, ThemeMode, themeModes } from "../domain";
import { Languages, languages } from "../localization/interfaces";
import { htmlLangByLanguage } from "../localization/utils";

enum StorageKeys {
  CaretMode = "caretMode",
  ThemeMode = "themeMode",
  language = "language",
  // time of the previous visit, ms since epoch
  LastLogin = "lastLogin",
}

// kept for the browser tab only: a new tab or window is a new session
enum SessionStorageKeys {
  SessionStarted = "sessionStarted",
}

// the area getter is called inside try: touching `localStorage` itself can throw
type StorageArea = () => typeof localStorage;
const local: StorageArea = () => localStorage;
const session: StorageArea = () => sessionStorage;

// storage access can throw (blocked cookies, Safari private mode, quota):
// settings persistence is optional, so failures fall back silently
const readItem = (key: StorageKeys | SessionStorageKeys, area = local): string | null => {
  try {
    return area().getItem(key);
  } catch {
    return null;
  }
};

// false when the value could not be stored
const writeItem = (key: StorageKeys | SessionStorageKeys, value: string, area = local) => {
  try {
    area().setItem(key, value);
    return true;
  } catch {
    // ignore: the setting just won't survive a reload
    return false;
  }
};

// without sessionStorage the session lasts until a reload, not until any navigation
let isSessionStartedInMemory = false;

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

  setLastLogin = (date: Date) => {
    writeItem(StorageKeys.LastLogin, String(date.getTime()));
  };

  // null before the first visit or on a garbage value
  getLastLogin = (): Date | null => {
    const value = readItem(StorageKeys.LastLogin);
    // Number("") is 0, so an empty value is rejected explicitly
    const time = value ? Number(value) : NaN;
    const date = new Date(time);
    // Date takes up to ±8.64e15 ms, a larger number is an Invalid Date
    return time > 0 && !Number.isNaN(date.getTime()) ? date : null;
  };

  // the boot animation plays once per session (browser tab)
  setSessionStarted = () => {
    if (!writeItem(SessionStorageKeys.SessionStarted, "true", session)) {
      isSessionStartedInMemory = true;
    }
  };

  isSessionStarted = (): boolean =>
    isSessionStartedInMemory || readItem(SessionStorageKeys.SessionStarted, session) === "true";
}

export default new Storage();
