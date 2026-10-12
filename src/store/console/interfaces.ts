import { CaretMode } from "../../domain";
import { ActionTypeGenerator } from "../interfaces";

// theme colors of a text, see styles/themes.scss
export type LogColor = "muted" | "accent" | "error";

// a piece of a log; a plain string is text
export type LogNode =
  | string
  | { type: "text"; text: string; color: LogColor }
  // only for the owner's texts (see linkify), never for echoed input, so a visitor
  // can't make a link that looks like part of the CV
  | { type: "link"; text: string; href: string }
  // a command name, highlighted
  | { type: "command"; command: string }
  // rows of cells, a cell is a list of nodes
  | { type: "table"; rows: LogNode[][][] }
  // kept as is: no wrapping, scrolls horizontally (ASCII art, aligned columns)
  | { type: "pre"; text: string };

// what is logged: one node or several in a row
export type LogContent = LogNode | LogNode[];

export interface NewLog {
  content: LogNode[];
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
