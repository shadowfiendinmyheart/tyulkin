import { CaretMode } from "../../components/Char";
import { ConsoleActionKind, Log } from "./interfaces";

export const addLog = (log: Log) => ({ type: ConsoleActionKind.AddLogs, payload: log });
export const addConsoleLog = (message: string) => {
  return {
    type: ConsoleActionKind.AddLogs,
    payload: { message },
  };
};
export const addUserLog = (message: string, location: string) => ({
  type: ConsoleActionKind.AddLogs,
  payload: { message: `${location}> ${message}` },
});
export const clearLogs = () => ({ type: ConsoleActionKind.ClearLogs });
export const addHistoryCommand = (command: string) => ({
  type: ConsoleActionKind.AddHistoryCommand,
  payload: command,
});
export const changeCurrentHistoryCommand = (command: string) => ({
  type: ConsoleActionKind.ChangeCurrentHistoryCommand,
  payload: command,
});
export const setCaretMode = (caretMode: CaretMode) => ({
  type: ConsoleActionKind.SetCaretMode,
  payload: caretMode,
});
export const setCommandsHint = (commandsHint: string[]) => ({
  type: ConsoleActionKind.SetCommandsHint,
  payload: commandsHint,
});
