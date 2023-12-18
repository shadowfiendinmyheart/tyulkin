import { CaretMode } from "../components/Caret";
import { Languages } from "../localization/interfaces";
import { ThemeMode } from "../store/app/interfaces";

export interface UserConfig {
  caretMode: CaretMode;
  colorThemeMode: ThemeMode;
  isConsoleMode: boolean; // TODO isConsoleMode => mode: "console" | "site" | "game" ...
}

enum StorageKeys {
  CaretMode = "caretMode",
  ThemeMode = "themeMode",
  language = "language",
}

class Storage {
  setCaretMode = (mode: CaretMode) => {
    localStorage.setItem(StorageKeys.CaretMode, mode);
  };

  getCaretMode = (): CaretMode => {
    const caretMode = localStorage.getItem(StorageKeys.CaretMode) as CaretMode | null;
    return caretMode || CaretMode.Default;
  };

  setThemeMode = (theme: ThemeMode) => {
    localStorage.setItem(StorageKeys.ThemeMode, theme);
  };

  getThemeMode = () => {
    const themeMode = localStorage.getItem(StorageKeys.ThemeMode) as ThemeMode | null;
    return themeMode || "Black";
  };

  setLanguage = (language: Languages) => {
    localStorage.setItem(StorageKeys.language, language);
  };

  getLanguage = () => {
    const language = localStorage.getItem(StorageKeys.language) as Languages | null;
    return language || "ru";
  };

  getInitialUserConfig = (): UserConfig => {
    return {
      caretMode: this.getCaretMode(),
      isConsoleMode: true,
      colorThemeMode: this.getThemeMode(),
    };
  };
}

export default new Storage();
