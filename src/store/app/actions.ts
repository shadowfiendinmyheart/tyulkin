import { Languages } from "../../localization/interfaces";
import { AppActionKind, AppStatus, ThemeMode } from "./interfaces";

export const setStatus = (status: AppStatus) => ({
  type: AppActionKind.SetStatus,
  payload: status,
});

export const setLanguage = (language: Languages) => ({
  type: AppActionKind.SetLanguage,
  payload: language,
});

export const setTheme = (theme: ThemeMode) => ({
  type: AppActionKind.SetTheme,
  payload: theme,
});
