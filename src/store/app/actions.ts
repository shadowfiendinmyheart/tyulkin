import { ThemeMode } from "../../domain";
import { ActionSetStatus, ActionSetTheme, AppActionKind, AppStatus } from "./interfaces";

export const setStatus = (status: AppStatus): ActionSetStatus => ({
  type: AppActionKind.SetStatus,
  payload: status,
});

export const setTheme = (theme: ThemeMode): ActionSetTheme => ({
  type: AppActionKind.SetTheme,
  payload: theme,
});
