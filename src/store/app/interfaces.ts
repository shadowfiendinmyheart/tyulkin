import { ThemeMode } from "../../domain";
import { ActionTypeGenerator } from "../interfaces";

export type AppStatus = "init" | "loading" | "error" | "ok";

// language lives in LocalizationContext together with its dictionary
export interface AppState {
  status: AppStatus;
  theme: ThemeMode;
  // shown instead of the theme while it is selected in the completion menu of `set theme`
  // (TASK-84); not saved, null: none
  previewTheme: ThemeMode | null;
}

export type AppActionType = ActionSetStatus | ActionSetTheme | ActionSetPreviewTheme;

export type ActionSetStatus = ActionTypeGenerator<AppActionKind.SetStatus, AppStatus>;
export type ActionSetTheme = ActionTypeGenerator<AppActionKind.SetTheme, ThemeMode>;
export type ActionSetPreviewTheme = ActionTypeGenerator<
  AppActionKind.SetPreviewTheme,
  ThemeMode | null
>;

export enum AppActionKind {
  SetStatus = "setStatus",
  SetTheme = "setTheme",
  SetPreviewTheme = "setPreviewTheme",
}
