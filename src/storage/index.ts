import { CaretMode, ThemeMode, themeModes } from "../domain";
import { Languages } from "../localization/interfaces";

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
    return caretMode || CaretMode.Block;
  };

  setThemeMode = (theme: ThemeMode) => {
    localStorage.setItem(StorageKeys.ThemeMode, theme);
  };

  getThemeMode = (): ThemeMode => {
    const themeMode = localStorage.getItem(StorageKeys.ThemeMode);
    return themeModes.find((theme) => theme === themeMode) || "Black";
  };

  setLanguage = (language: Languages) => {
    localStorage.setItem(StorageKeys.language, language);
  };

  getLanguage = () => {
    const language = localStorage.getItem(StorageKeys.language) as Languages | null;
    return language || "ru";
  };
}

export default new Storage();
