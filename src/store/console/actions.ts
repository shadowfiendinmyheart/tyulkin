import { CaretMode } from "../../components/Char";
import { ConsoleActionKind, Log } from "./interfaces";

export const addLog = (log: Log) => ({ type: ConsoleActionKind.AddLogs, payload: log });
export const addConsoleLog = (message: string, location: string) => {
  return {
    type: ConsoleActionKind.AddLogs,
    payload: { message, location, isUserPrint: false },
  };
};
export const addUserLog = (message: string, location: string) => ({
  type: ConsoleActionKind.AddLogs,
  payload: { message, location, isUserPrint: true },
});
export const clearLogs = () => ({ type: ConsoleActionKind.ClearLogs });
export const addUserCommand = (command: string) => ({
  type: ConsoleActionKind.AddUserCommand,
  payload: command,
});
export const changeFirstUserCommand = (command: string) => ({
  type: ConsoleActionKind.ChangeFirstUserCommand,
  payload: command,
});
export const setCaretMode = (caretMode: CaretMode) => ({
  type: ConsoleActionKind.SetCaretMode,
  payload: caretMode,
});
