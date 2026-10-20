import {
  allThemeModes,
  CaretMode,
  caretModes,
  CrtMode,
  crtModes,
  DEFAULT_FONT_MODE,
  DEFAULT_FONT_SIZE,
  FontMode,
  fontModes,
  GameId,
  gameIds,
  HISTORY_LIMIT,
  oneOf,
  parseFontSize,
  SecretId,
  secretIds,
  SoundMode,
  soundModes,
  ThemeMode,
} from "../domain";
import { Languages, languages } from "../localization/interfaces";
import { htmlLangByLanguage } from "../localization/utils";

enum StorageKeys {
  CaretMode = "caretMode",
  ThemeMode = "themeMode",
  CrtMode = "crtMode",
  SoundMode = "soundMode",
  // the font of the terminal and its size in px (TASK-83)
  FontMode = "fontMode",
  FontSize = "fontSize",
  language = "language",
  // time of the previous visit, ms since epoch
  LastLogin = "lastLogin",
  // easter eggs found by the visitor, a JSON array of secret ids
  FoundSecrets = "foundSecrets",
  // executed commands, newest first, a JSON array of strings (TASK-61)
  History = "history",
  // the best scores of the mini-games (TASK-66), a JSON object { [game id]: score }
  GameRecords = "gameRecords",
}

// kept for the browser tab only: a new tab or window is a new session
enum SessionStorageKeys {
  SessionStarted = "sessionStarted",
  // the visitor has been offered (or has opened) the regular view of the CV
  GuiOffered = "guiOffered",
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

// without sessionStorage session flags last until a reload, not until any navigation
const sessionFlagsInMemory = new Set<SessionStorageKeys>();

const setSessionFlag = (key: SessionStorageKeys) => {
  if (!writeItem(key, "true", session)) sessionFlagsInMemory.add(key);
};

const getSessionFlag = (key: SessionStorageKeys) =>
  sessionFlagsInMemory.has(key) || readItem(key, session) === "true";

// without localStorage found secrets last until a reload
const foundSecretsInMemory = new Set<SecretId>();

// valid ids of a stored JSON array, anything else is dropped
const parseSecrets = (value: string | null): SecretId[] => {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.flatMap((item) => oneOf(secretIds, item) ?? []) : [];
  } catch {
    return [];
  }
};

// the commands of a stored JSON array, at most HISTORY_LIMIT; anything else is dropped
const parseHistory = (value: string | null): string[] => {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim() !== "")
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
};

// without localStorage records last until a reload
const gameRecordsInMemory: Partial<Record<GameId, number>> = {};

// the records of a stored JSON object: known games with a whole non-negative score, the rest dropped
const parseGameRecords = (value: string | null): Partial<Record<GameId, number>> => {
  try {
    const parsed: unknown = value ? JSON.parse(value) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const records: Partial<Record<GameId, number>> = {};
    for (const [game, score] of Object.entries(parsed)) {
      const id = oneOf(gameIds, game);
      if (id && typeof score === "number" && Number.isSafeInteger(score) && score >= 0)
        records[id] = score;
    }
    return records;
  } catch {
    return {};
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

// a light system color scheme gets the White theme, anything else the Black one;
// jsdom has no matchMedia
const getPreferredTheme = (): ThemeMode =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: light)").matches
    ? "White"
    : "Black";

class Storage {
  setCaretMode = (mode: CaretMode) => {
    writeItem(StorageKeys.CaretMode, mode);
  };

  getCaretMode = (): CaretMode => readOneOf(StorageKeys.CaretMode, caretModes, CaretMode.Block);

  setThemeMode = (theme: ThemeMode) => {
    writeItem(StorageKeys.ThemeMode, theme);
  };

  // until a theme is set, the one of the system color scheme at load (not stored, so the next
  // visit follows the system again, TASK-73)
  getThemeMode = (): ThemeMode =>
    oneOf(allThemeModes, readItem(StorageKeys.ThemeMode)) ?? getPreferredTheme();

  setCrtMode = (mode: CrtMode) => {
    writeItem(StorageKeys.CrtMode, mode);
  };

  // off by default: the effect is opt-in
  getCrtMode = (): CrtMode => readOneOf(StorageKeys.CrtMode, crtModes, "off");

  setSoundMode = (mode: SoundMode) => {
    writeItem(StorageKeys.SoundMode, mode);
  };

  // off by default: a page must not make sounds unasked
  getSoundMode = (): SoundMode => readOneOf(StorageKeys.SoundMode, soundModes, "off");

  setFontMode = (font: FontMode) => {
    writeItem(StorageKeys.FontMode, font);
  };

  getFontMode = (): FontMode => readOneOf(StorageKeys.FontMode, fontModes, DEFAULT_FONT_MODE);

  setFontSize = (size: number) => {
    writeItem(StorageKeys.FontSize, String(size));
  };

  // a garbage or out-of-range value gives the default size
  getFontSize = (): number => parseFontSize(readItem(StorageKeys.FontSize)) ?? DEFAULT_FONT_SIZE;

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

  // in the order of secretIds, without duplicates
  getFoundSecrets = (): SecretId[] => {
    const stored = parseSecrets(readItem(StorageKeys.FoundSecrets));
    return secretIds.filter((id) => stored.includes(id) || foundSecretsInMemory.has(id));
  };

  // the found secrets with this one when it is found for the first time, else undefined
  addFoundSecret = (secret: SecretId): SecretId[] | undefined => {
    const found = this.getFoundSecrets();
    if (found.includes(secret)) return;
    if (!writeItem(StorageKeys.FoundSecrets, JSON.stringify([...found, secret]))) {
      foundSecretsInMemory.add(secret);
    }
    return secretIds.filter((id) => id === secret || found.includes(id));
  };

  // the history survives visits (TASK-61); without localStorage it lasts until a reload
  setHistory = (history: string[]) => {
    writeItem(StorageKeys.History, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  };

  getHistory = (): string[] => parseHistory(readItem(StorageKeys.History));

  // the best score of a mini-game, 0 before the first one (TASK-66)
  getGameRecord = (game: GameId): number =>
    Math.max(
      parseGameRecords(readItem(StorageKeys.GameRecords))[game] ?? 0,
      gameRecordsInMemory[game] ?? 0,
    );

  // keeps the score when it beats the record; true when it does
  setGameRecord = (game: GameId, score: number): boolean => {
    const stored = parseGameRecords(readItem(StorageKeys.GameRecords));
    if (score <= Math.max(stored[game] ?? 0, gameRecordsInMemory[game] ?? 0)) return false;
    const records = { ...stored, [game]: score };
    if (!writeItem(StorageKeys.GameRecords, JSON.stringify(records))) {
      gameRecordsInMemory[game] = score;
    }
    return true;
  };

  // the boot animation plays once per session (browser tab)
  setSessionStarted = () => setSessionFlag(SessionStorageKeys.SessionStarted);

  isSessionStarted = (): boolean => getSessionFlag(SessionStorageKeys.SessionStarted);

  // the terminal offers the regular view once per session, and not after it has been opened
  setGuiOffered = () => setSessionFlag(SessionStorageKeys.GuiOffered);

  isGuiOffered = (): boolean => getSessionFlag(SessionStorageKeys.GuiOffered);
}

export default new Storage();
