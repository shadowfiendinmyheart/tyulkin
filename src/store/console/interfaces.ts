import { CaretMode, CrtMode, GameId, SoundMode } from "../../domain";
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
  // a command name, highlighted; a click runs it. label: shown instead of the command
  // (`ls` shows "about.md", a click runs "cat ~/about.md")
  | { type: "command"; command: string; label?: string }
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
  // executed commands, newest first, at most HISTORY_LIMIT; kept in storage between visits
  history: string[];
  // commands added to the history in this session: the history is capped, so its length
  // doesn't show that an entry was added (browsing and Ctrl+R follow new entries by this)
  historyAdded: number;
  // commands the visitor typed and entered, not clicked: the quick commands hide after a few
  typedCommandsCount: number;
  caretMode: CaretMode;
  // the CRT monitor effect over the console (`set crt on|off`)
  crtMode: CrtMode;
  // keyboard clicks while typing (`set sound on|off`)
  soundMode: SoundMode;
  commandsHint: string[];
  // the `matrix` digital rain covers the console until any key or tap
  isMatrixShown: boolean;
  // the mini-game played over the console (TASK-66), null when none
  game: GameId | null;
}

export type ConsoleActionType =
  | ActionAddLogs
  | ActionClearLogs
  | ActionAddHistoryCommand
  | ActionClearHistory
  | ActionCountTypedCommand
  | ActionSetCaretMode
  | ActionSetCrtMode
  | ActionSetSoundMode
  | ActionSetCommandsHint
  | ActionFinishTyping
  | ActionSkipTyping
  | ActionSetMatrixShown
  | ActionSetGame;

export type ActionAddLogs = ActionTypeGenerator<ConsoleActionKind.AddLogs, NewLog>;
export type ActionClearLogs = ActionTypeGenerator<ConsoleActionKind.ClearLogs>;
// payload: id of the typed out log
export type ActionFinishTyping = ActionTypeGenerator<ConsoleActionKind.FinishTyping, number>;
export type ActionSkipTyping = ActionTypeGenerator<ConsoleActionKind.SkipTyping>;
export type ActionSetMatrixShown = ActionTypeGenerator<ConsoleActionKind.SetMatrixShown, boolean>;
export type ActionSetGame = ActionTypeGenerator<ConsoleActionKind.SetGame, GameId | null>;
export type ActionAddHistoryCommand = ActionTypeGenerator<
  ConsoleActionKind.AddHistoryCommand,
  string
>;
export type ActionClearHistory = ActionTypeGenerator<ConsoleActionKind.ClearHistory>;
export type ActionCountTypedCommand = ActionTypeGenerator<ConsoleActionKind.CountTypedCommand>;
export type ActionSetCaretMode = ActionTypeGenerator<ConsoleActionKind.SetCaretMode, CaretMode>;
export type ActionSetCrtMode = ActionTypeGenerator<ConsoleActionKind.SetCrtMode, CrtMode>;
export type ActionSetSoundMode = ActionTypeGenerator<ConsoleActionKind.SetSoundMode, SoundMode>;
export type ActionSetCommandsHint = ActionTypeGenerator<
  ConsoleActionKind.SetCommandsHint,
  string[]
>;

export enum ConsoleActionKind {
  AddLogs = "addLogs",
  ClearLogs = "clearLogs",
  AddHistoryCommand = "addHistoryCommand",
  ClearHistory = "clearHistory",
  CountTypedCommand = "countTypedCommand",
  SetCaretMode = "setCaretMode",
  SetCrtMode = "setCrtMode",
  SetSoundMode = "setSoundMode",
  SetCommandsHint = "setCommandsHint",
  FinishTyping = "finishTyping",
  SkipTyping = "skipTyping",
  SetMatrixShown = "setMatrixShown",
  SetGame = "setGame",
}
