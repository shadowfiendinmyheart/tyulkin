import { CaretMode } from "../../domain";
import {
  ActionAddHistoryCommand,
  ActionAddLogs,
  ActionClearLogs,
  ActionSetCaretMode,
  ActionSetCommandsHint,
  ConsoleActionKind,
} from "./interfaces";

export const addConsoleLog = (message: string, withLinks = false): ActionAddLogs => {
  return {
    type: ConsoleActionKind.AddLogs,
    payload: withLinks ? { message, withLinks } : { message },
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
