import { CaretMode } from "../../domain";
import { ActionTypeGenerator } from "../interfaces";

export interface Log {
  message: string;
}
export type Logs = Array<Log>;

export interface ConsoleState {
  logs: Logs;
  // executed commands, newest first
  history: string[];
  caretMode: CaretMode;
  commandsHint: string[];
}

export type ConsoleActionType =
  | ActionAddLogs
  | ActionClearLogs
  | ActionAddHistoryCommand
  | ActionSetCaretMode
  | ActionSetCommandsHint;

export type ActionAddLogs = ActionTypeGenerator<ConsoleActionKind.AddLogs, Log>;
export type ActionClearLogs = ActionTypeGenerator<ConsoleActionKind.ClearLogs>;
export type ActionAddHistoryCommand = ActionTypeGenerator<
  ConsoleActionKind.AddHistoryCommand,
  string
>;
export type ActionSetCaretMode = ActionTypeGenerator<ConsoleActionKind.SetCaretMode, CaretMode>;
export type ActionSetCommandsHint = ActionTypeGenerator<
  ConsoleActionKind.SetCommandsHint,
  string[]
>;

export enum ConsoleActionKind {
  AddLogs = "addLogs",
  ClearLogs = "clearLogs",
  AddHistoryCommand = "addHistoryCommand",
  SetCaretMode = "setCaretMode",
  SetCommandsHint = "setCommandsHint",
}
