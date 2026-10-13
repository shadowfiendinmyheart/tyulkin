import { CaretMode, CrtMode } from "../../domain";
import {
  ActionAddHistoryCommand,
  ActionAddLogs,
  ActionClearHistory,
  ActionClearLogs,
  ActionCountTypedCommand,
  ActionFinishTyping,
  ActionSetCaretMode,
  ActionSetCrtMode,
  ActionSetCommandsHint,
  ActionSetMatrixShown,
  ActionSkipTyping,
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
  payload: { content: [`${location}> ${message}`], instant: true },
});
export const clearLogs = (): ActionClearLogs => ({ type: ConsoleActionKind.ClearLogs });
export const finishTyping = (logId: number): ActionFinishTyping => ({
  type: ConsoleActionKind.FinishTyping,
  payload: logId,
});
// shows every log in full at once
export const skipTyping = (): ActionSkipTyping => ({ type: ConsoleActionKind.SkipTyping });
export const setMatrixShown = (isShown: boolean): ActionSetMatrixShown => ({
  type: ConsoleActionKind.SetMatrixShown,
  payload: isShown,
});
export const addHistoryCommand = (command: string): ActionAddHistoryCommand => ({
  type: ConsoleActionKind.AddHistoryCommand,
  payload: command,
});
// `history -c`
export const clearHistory = (): ActionClearHistory => ({ type: ConsoleActionKind.ClearHistory });
export const countTypedCommand = (): ActionCountTypedCommand => ({
  type: ConsoleActionKind.CountTypedCommand,
});
export const setCaretMode = (caretMode: CaretMode): ActionSetCaretMode => ({
  type: ConsoleActionKind.SetCaretMode,
  payload: caretMode,
});
export const setCrtMode = (crtMode: CrtMode): ActionSetCrtMode => ({
  type: ConsoleActionKind.SetCrtMode,
  payload: crtMode,
});
export const setCommandsHint = (commandsHint: string[]): ActionSetCommandsHint => ({
  type: ConsoleActionKind.SetCommandsHint,
  payload: commandsHint,
});
