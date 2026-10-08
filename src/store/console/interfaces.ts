import { CaretMode } from "../../domain";
import { ActionTypeGenerator } from "../interfaces";

export interface NewLog {
  message: string;
}
export interface Log extends NewLog {
  // stable React key: logs are dropped from the start (MAX_LOGS), so indexes shift
  id: number;
}
export type Logs = Array<Log>;

export interface ConsoleState {
  // the newest MAX_LOGS logs
  logs: Logs;
  // id of the next added log; never reset, so ids stay unique after clear
  nextLogId: number;
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

export type ActionAddLogs = ActionTypeGenerator<ConsoleActionKind.AddLogs, NewLog>;
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
