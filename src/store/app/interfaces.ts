import { ThemeMode } from "../../domain";
import { ActionTypeGenerator } from "../interfaces";

export type AppStatus = "init" | "loading" | "error" | "ok";

// language lives in LocalizationContext together with its dictionary
export interface AppState {
  status: AppStatus;
  theme: ThemeMode;
}

export type AppActionType = ActionSetStatus | ActionSetTheme;

export type ActionSetStatus = ActionTypeGenerator<AppActionKind.SetStatus, AppStatus>;
export type ActionSetTheme = ActionTypeGenerator<AppActionKind.SetTheme, ThemeMode>;

export enum AppActionKind {
  SetStatus = "setStatus",
  SetTheme = "setTheme",
}
