import { CaretMode } from "../../domain";
import {
  ActionAddHistoryCommand,
  ActionAddLogs,
  ActionClearLogs,
  ActionSetCaretMode,
  ActionSetCommandsHint,
  ConsoleActionKind,
  LogContent,
} from "./interfaces";

export const addConsoleLog = (content: LogContent): ActionAddLogs => ({
  type: ConsoleActionKind.AddLogs,
  payload: { content: Array.isArray(content) ? content : [content] },
});
// the echoed input is plain text: never a link or a command
export const addUserLog = (message: string, location: string): ActionAddLogs => ({
  type: ConsoleActionKind.AddLogs,
  payload: { content: [`${location}> ${message}`] },
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
