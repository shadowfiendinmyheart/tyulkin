import { CaretMode } from "../../domain";
import { ActionTypeGenerator } from "../interfaces";

// theme colors of a text, see styles/themes.scss
export type LogColor = "text" | "muted" | "accent" | "error";

// a piece of a log; a plain string is text
export type LogNode =
  | string
  // decorative: hidden from screen readers (the palette strip of neofetch)
  | { type: "text"; text: string; color: LogColor; decorative?: boolean }
  // only for the owner's texts (see linkify), never for echoed input, so a visitor
  // can't make a link that looks like part of the CV
  | { type: "link"; text: string; href: string }
  // a command name, highlighted
  | { type: "command"; command: string }
  // rows of cells, a cell is a list of nodes
  | { type: "table"; rows: LogNode[][][] }
  // kept as is: no wrapping, scrolls horizontally (ASCII art, aligned columns)
  | { type: "pre"; text: string; decorative?: boolean };

// what is logged: one node or several in a row
export type LogContent = LogNode | LogNode[];

export interface Log {
  content: LogNode[];
  // stable React key: logs are dropped from the start (MAX_LOGS), so indexes shift
  id: number;
}
export interface NewLog {
  content: LogNode[];
  // shown at once, not typed out (the echoed input); everything typed before it is shown too
  instant?: boolean;
}
export type Logs = Array<Log>;

export interface ConsoleState {
  // the newest MAX_LOGS logs
  logs: Logs;
  // id of the next added log; never reset, so ids stay unique after clear
  nextLogId: number;
  // logs with a smaller id are shown in full; the log with this id is being typed out,
  // later ones wait for it (see Logs)
  typedLogId: number;
  // executed commands, newest first
  history: string[];
  // commands the visitor typed and entered, not clicked: the quick commands hide after a few
  typedCommandsCount: number;
  caretMode: CaretMode;
  commandsHint: string[];
}

export type ConsoleActionType =
  | ActionAddLogs
  | ActionClearLogs
  | ActionAddHistoryCommand
  | ActionCountTypedCommand
  | ActionSetCaretMode
  | ActionSetCommandsHint
  | ActionFinishTyping
  | ActionSkipTyping;

export type ActionAddLogs = ActionTypeGenerator<ConsoleActionKind.AddLogs, NewLog>;
export type ActionClearLogs = ActionTypeGenerator<ConsoleActionKind.ClearLogs>;
// payload: id of the typed out log
export type ActionFinishTyping = ActionTypeGenerator<ConsoleActionKind.FinishTyping, number>;
export type ActionSkipTyping = ActionTypeGenerator<ConsoleActionKind.SkipTyping>;
export type ActionAddHistoryCommand = ActionTypeGenerator<
  ConsoleActionKind.AddHistoryCommand,
  string
>;
export type ActionCountTypedCommand = ActionTypeGenerator<ConsoleActionKind.CountTypedCommand>;
export type ActionSetCaretMode = ActionTypeGenerator<ConsoleActionKind.SetCaretMode, CaretMode>;
export type ActionSetCommandsHint = ActionTypeGenerator<
  ConsoleActionKind.SetCommandsHint,
  string[]
>;

export enum ConsoleActionKind {
  AddLogs = "addLogs",
  ClearLogs = "clearLogs",
  AddHistoryCommand = "addHistoryCommand",
  CountTypedCommand = "countTypedCommand",
  SetCaretMode = "setCaretMode",
  SetCommandsHint = "setCommandsHint",
  FinishTyping = "finishTyping",
  SkipTyping = "skipTyping",
}
