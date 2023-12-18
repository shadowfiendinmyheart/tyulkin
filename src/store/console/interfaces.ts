import { CaretMode } from "../../components/Caret";
import { ActionTypeGenerator } from "../interfaces";

export interface Log {
  message: string;
  isUserPrint: boolean;
}
export type Logs = Array<Log>;

export interface ConsoleState {
  logs: Logs;
  userCommands: string[];
  caretMode: CaretMode;
}

// TODO: fix undefined in payload
export type ConsoleActionType =
  | ActionAddLogs
  | ActionClearLogs
  | ActionAddUserCommand
  | ActionChangeFirstUserCommand
  | ActionSetCaretMode;

export type ActionAddLogs = ActionTypeGenerator<ConsoleActionKind.AddLogs, Log>;
export type ActionClearLogs = ActionTypeGenerator<ConsoleActionKind.ClearLogs>;
export type ActionAddUserCommand = ActionTypeGenerator<ConsoleActionKind.AddUserCommand, string>;
export type ActionChangeFirstUserCommand = ActionTypeGenerator<
  ConsoleActionKind.ChangeFirstUserCommand,
  string
>;
export type ActionSetCaretMode = ActionTypeGenerator<ConsoleActionKind.SetCaretMode, CaretMode>;

export enum ConsoleActionKind {
  AddLogs = "addLogs",
  ClearLogs = "clearLogs",
  AddUserCommand = "addUserCommand",
  ChangeFirstUserCommand = "changeFirstUserCommand",
  SetCaretMode = "setCaretMode",
}
