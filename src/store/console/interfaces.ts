import {
  AnsiColor,
  CaretMode,
  ThemeMode,
  CrtMode,
  FontMode,
  GameId,
  OverlayId,
  SecretId,
  ShutdownPhase,
  SoundMode,
} from "../../domain";
import { ActionTypeGenerator } from "../interfaces";

// theme colors of a text, see styles/themes.scss: the semantic ones and the ANSI palette
export type LogColor =
  "text" | "muted" | "accent" | "error" | "success" | "warning" | `ansi-${AnsiColor}`;

// a place in the output: the line and the column in it (`| lolcat` colors by it, TASK-99)
export interface RainbowPosition {
  row: number;
  col: number;
}

// a piece of a log; a plain string is text
export type LogNode =
  | string
  // decorative: hidden from screen readers (the palette strip of neofetch)
  | { type: "text"; text: string; color: LogColor; decorative?: boolean }
  // only for the owner's texts (see linkify), never for echoed input, so a visitor
  // can't make a link that looks like part of the CV
  | { type: "link"; text: string; href: string }
  // a command name, highlighted; a click runs it. label: shown instead of the command
  // (`ls` shows "about.md", a click runs "cat ~/about.md"). theme: the colors of the theme are
  // shown before it (`show themes`, TASK-84)
  | { type: "command"; command: string; label?: string; theme?: ThemeMode }
  // rows of cells, a cell is a list of nodes
  | { type: "table"; rows: LogNode[][][] }
  // kept as is: no wrapping, scrolls horizontally (ASCII art, aligned columns).
  // qr: a QR code of half blocks (TASK-96), dark on light in any theme and shown on a phone too.
  // rainbow: colored by `| lolcat` (TASK-99) from this place of the output on, see rainbow.ts.
  // label: what screen readers read instead of the art (`figlet`)
  | {
      type: "pre";
      text: string;
      decorative?: boolean;
      qr?: boolean;
      rainbow?: RainbowPosition;
      label?: string;
    };

// what is logged: one node or several in a row
export type LogContent = LogNode | LogNode[];

// the echoed input: it starts a block of the command and its output, as in Warp (TASK-82)
export interface Echo {
  // "visitor@tyulkin ~ ❯"
  prompt: string;
  // the line as entered
  input: string;
  // what a click on the input runs again (`!!` expanded); none for a line that wasn't run
  // (empty, dropped by ^C): plain text then, without a status
  command?: string;
  // tells the block apart for failCommand: an error may come after another command was entered
  // (`ask` fails once its request does)
  blockId: number;
  // when it was entered, ms since the epoch: shown on hover
  time: number;
  // the command failed (unknown, wrong path…): ✗ instead of ✓
  failed?: boolean;
}

export interface Log {
  content: LogNode[];
  // stable React key: logs are dropped from the start (MAX_LOGS), so indexes shift
  id: number;
  echo?: Echo;
}
export interface NewLog {
  content: LogNode[];
  // shown at once, not typed out (the echoed input); everything typed before it is shown too
  instant?: boolean;
  echo?: Echo;
  // the output of this block (the blockId of its echo): put after its last log, not after a newer
  // command (`ask` streams on, TASK-102); at the end when there is no such block (cleared, dropped)
  blockId?: number;
}
export type Logs = Array<Log>;

// a secret found for the first time, shown as a toast (TASK-97)
export interface Achievement {
  secret: SecretId;
  // how many secrets are found with this one
  found: number;
  // tells the toasts apart: a new one replaces the shown one and starts its time anew
  id: number;
}

// a mini-game over the console (TASK-66)
export interface RunningGame {
  id: GameId;
  // the block of the command that started it: what the game logs goes there (TASK-102)
  blockId: number;
  // marks that block failed: the game couldn't load (TASK-101)
  fail: () => void;
}

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
  // the font of the terminal and its size in px (`set font`, `set fontsize`, TASK-83)
  fontMode: FontMode;
  fontSize: number;
  commandsHint: string[];
  // the `matrix` digital rain or a screensaver (TASK-95) covers the console until any key or tap,
  // null when none
  overlay: OverlayId | null;
  // the mini-game played over the console (TASK-66), null when none
  game: RunningGame | null;
  // the toast of the last found secret (TASK-97), null when hidden
  achievement: Achievement | null;
  // `exit` (TASK-98): the screen is going out, or is out until restart; null when on
  shutdown: ShutdownPhase | null;
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
  | ActionSetFontMode
  | ActionSetFontSize
  | ActionSetCommandsHint
  | ActionFinishTyping
  | ActionSkipTyping
  | ActionSetOverlay
  | ActionSetGame
  | ActionSetShutdown
  | ActionShowAchievement
  | ActionHideAchievement
  | ActionFailCommand;

export type ActionAddLogs = ActionTypeGenerator<ConsoleActionKind.AddLogs, NewLog>;
export type ActionClearLogs = ActionTypeGenerator<ConsoleActionKind.ClearLogs>;
// payload: the blockId of the echo
export type ActionFailCommand = ActionTypeGenerator<ConsoleActionKind.FailCommand, number>;
// payload: id of the typed out log
export type ActionFinishTyping = ActionTypeGenerator<ConsoleActionKind.FinishTyping, number>;
export type ActionSkipTyping = ActionTypeGenerator<ConsoleActionKind.SkipTyping>;
export type ActionSetOverlay = ActionTypeGenerator<ConsoleActionKind.SetOverlay, OverlayId | null>;
export type ActionSetGame = ActionTypeGenerator<ConsoleActionKind.SetGame, RunningGame | null>;
export type ActionSetShutdown = ActionTypeGenerator<
  ConsoleActionKind.SetShutdown,
  ShutdownPhase | null
>;
export type ActionShowAchievement = ActionTypeGenerator<
  ConsoleActionKind.ShowAchievement,
  Achievement
>;
// payload: the id of the achievement to hide, so a newer one stays
export type ActionHideAchievement = ActionTypeGenerator<ConsoleActionKind.HideAchievement, number>;
export type ActionAddHistoryCommand = ActionTypeGenerator<
  ConsoleActionKind.AddHistoryCommand,
  string
>;
export type ActionClearHistory = ActionTypeGenerator<ConsoleActionKind.ClearHistory>;
export type ActionCountTypedCommand = ActionTypeGenerator<ConsoleActionKind.CountTypedCommand>;
export type ActionSetCaretMode = ActionTypeGenerator<ConsoleActionKind.SetCaretMode, CaretMode>;
export type ActionSetCrtMode = ActionTypeGenerator<ConsoleActionKind.SetCrtMode, CrtMode>;
export type ActionSetSoundMode = ActionTypeGenerator<ConsoleActionKind.SetSoundMode, SoundMode>;
export type ActionSetFontMode = ActionTypeGenerator<ConsoleActionKind.SetFontMode, FontMode>;
export type ActionSetFontSize = ActionTypeGenerator<ConsoleActionKind.SetFontSize, number>;
export type ActionSetCommandsHint = ActionTypeGenerator<
  ConsoleActionKind.SetCommandsHint,
  string[]
>;

export enum ConsoleActionKind {
  AddLogs = "addLogs",
  ClearLogs = "clearLogs",
  FailCommand = "failCommand",
  AddHistoryCommand = "addHistoryCommand",
  ClearHistory = "clearHistory",
  CountTypedCommand = "countTypedCommand",
  SetCaretMode = "setCaretMode",
  SetCrtMode = "setCrtMode",
  SetSoundMode = "setSoundMode",
  SetFontMode = "setFontMode",
  SetFontSize = "setFontSize",
  SetCommandsHint = "setCommandsHint",
  FinishTyping = "finishTyping",
  SkipTyping = "skipTyping",
  SetOverlay = "setOverlay",
  SetGame = "setGame",
  SetShutdown = "setShutdown",
  ShowAchievement = "showAchievement",
  HideAchievement = "hideAchievement",
}
