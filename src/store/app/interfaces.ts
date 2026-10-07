import { Languages } from "../../localization/interfaces";
import { ActionTypeGenerator } from "../interfaces";

export type AppStatus = "init" | "loading" | "error" | "ok";

export const themeModes = ["White", "Black", "Light", "Dark", "Hacker"] as const;
export type ThemeMode = (typeof themeModes)[number];

export interface AppState {
  status: AppStatus;
  language: Languages;
  theme: ThemeMode;
}

export type AppActionType = ActionSetStatus | ActionSetLanguage | ActionSetTheme;

export type ActionSetStatus = ActionTypeGenerator<AppActionKind.SetStatus, AppStatus>;
export type ActionSetLanguage = ActionTypeGenerator<AppActionKind.SetLanguage, Languages>;
export type ActionSetTheme = ActionTypeGenerator<AppActionKind.SetTheme, ThemeMode>;

export enum AppActionKind {
  SetStatus = "setStatus",
  SetLanguage = "setLanguage",
  SetTheme = "setTheme",
}
