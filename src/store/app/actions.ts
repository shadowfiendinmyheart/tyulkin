import { ThemeMode } from "../../domain";
import {
  ActionSetPreviewTheme,
  ActionSetStatus,
  ActionSetTheme,
  AppActionKind,
  AppStatus,
} from "./interfaces";

export const setStatus = (status: AppStatus): ActionSetStatus => ({
  type: AppActionKind.SetStatus,
  payload: status,
});

export const setTheme = (theme: ThemeMode): ActionSetTheme => ({
  type: AppActionKind.SetTheme,
  payload: theme,
});

export const setPreviewTheme = (theme: ThemeMode | null): ActionSetPreviewTheme => ({
  type: AppActionKind.SetPreviewTheme,
  payload: theme,
});
