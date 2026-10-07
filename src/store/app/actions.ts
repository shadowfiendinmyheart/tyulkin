import { Languages } from "../../localization/interfaces";
import {
  ActionSetLanguage,
  ActionSetStatus,
  ActionSetTheme,
  AppActionKind,
  AppStatus,
  ThemeMode,
} from "./interfaces";

export const setStatus = (status: AppStatus): ActionSetStatus => ({
  type: AppActionKind.SetStatus,
  payload: status,
});

export const setLanguage = (language: Languages): ActionSetLanguage => ({
  type: AppActionKind.SetLanguage,
  payload: language,
});

export const setTheme = (theme: ThemeMode): ActionSetTheme => ({
  type: AppActionKind.SetTheme,
  payload: theme,
});
