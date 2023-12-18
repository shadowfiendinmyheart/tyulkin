import { Languages } from "../../localization/interfaces";
import { ActionTypeGenerator } from "../interfaces";

export type AppStatus = "init" | "loading" | "error" | "ok";
export type ThemeMode = "White" | "Black" | "Light" | "Dark" | "Hacker";

export interface AppState {
  status: AppStatus;
  language: Languages;
  theme: ThemeMode;
}

// TODO: fix undefined in payload
export type AppActionType = ActionSetStatus | ActionSetLanguage | ActionSetTheme;

export type ActionSetStatus = ActionTypeGenerator<AppActionKind.SetStatus, AppStatus>;
export type ActionSetLanguage = ActionTypeGenerator<AppActionKind.SetLanguage, Languages>;
export type ActionSetTheme = ActionTypeGenerator<AppActionKind.SetTheme, ThemeMode>;

export enum AppActionKind {
  SetStatus = "setStatus",
  SetLanguage = "setLanguage",
  SetTheme = "setTheme",
}
