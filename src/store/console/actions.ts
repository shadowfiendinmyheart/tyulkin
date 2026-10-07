import { CaretMode } from "../../components/Char";
import {
  ActionAddHistoryCommand,
  ActionAddLogs,
  ActionClearLogs,
  ActionSetCaretMode,
  ActionSetCommandsHint,
  ConsoleActionKind,
  Log,
} from "./interfaces";

export const addLog = (log: Log): ActionAddLogs => ({
  type: ConsoleActionKind.AddLogs,
  payload: log,
});
export const addConsoleLog = (message: string): ActionAddLogs => {
  return {
    type: ConsoleActionKind.AddLogs,
    payload: { message },
  };
};
export const addUserLog = (message: string, location: string): ActionAddLogs => ({
  type: ConsoleActionKind.AddLogs,
  payload: { message: `${location}> ${message}` },
});
export const clearLogs = (): ActionClearLogs => ({ type: ConsoleActionKind.ClearLogs });
export const addHistoryCommand = (command: string): ActionAddHistoryCommand => ({
  type: ConsoleActionKind.AddHistoryCommand,
  payload: command,
});
export const setCaretMode = (caretMode: CaretMode): ActionSetCaretMode => ({
  type: ConsoleActionKind.SetCaretMode,
  payload: caretMode,
});
export const setCommandsHint = (commandsHint: string[]): ActionSetCommandsHint => ({
  type: ConsoleActionKind.SetCommandsHint,
  payload: commandsHint,
});
