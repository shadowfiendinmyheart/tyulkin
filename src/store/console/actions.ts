import {
  CaretMode,
  CrtMode,
  FontMode,
  OverlayId,
  SecretId,
  ShutdownPhase,
  SoundMode,
} from "../../domain";
import {
  ActionAddHistoryCommand,
  ActionAddLogs,
  ActionClearHistory,
  ActionClearLogs,
  ActionFailCommand,
  ActionCountTypedCommand,
  ActionFinishTyping,
  ActionSetCaretMode,
  ActionSetCrtMode,
  ActionSetSoundMode,
  ActionSetFontMode,
  ActionSetFontSize,
  ActionSetCommandsHint,
  ActionSetOverlay,
  ActionSetGame,
  ActionSetShutdown,
  ActionShowAchievement,
  ActionHideAchievement,
  ActionSkipTyping,
  ConsoleActionKind,
  Echo,
  LogContent,
  RunningGame,
} from "./interfaces";

// blockId: the output of that block (TASK-102), see NewLog
export const addConsoleLog = (content: LogContent, blockId?: number): ActionAddLogs => ({
  type: ConsoleActionKind.AddLogs,
  payload: {
    content: Array.isArray(content) ? content : [content],
    ...(blockId !== undefined && { blockId }),
  },
});
// unique within the page's session: logs outlive a route change, the store too
let lastBlockId = 0;

// the echoed input is plain text: never a link or a command node; it starts a block (TASK-82).
// prompt: "visitor@tyulkin ~ ❯" (see getPrompt); command: what a click on the input runs again,
// none for a line that wasn't run (^C)
export const addUserLog = (
  message: string,
  prompt: string,
  command?: string,
): ActionAddLogs & { payload: { echo: Echo } } => ({
  type: ConsoleActionKind.AddLogs,
  payload: {
    content: [`${prompt} ${message}`],
    instant: true,
    echo: {
      prompt,
      input: message,
      command: command || undefined,
      blockId: ++lastBlockId,
      time: Date.now(),
    },
  },
});
export const clearLogs = (): ActionClearLogs => ({ type: ConsoleActionKind.ClearLogs });
// marks the block of a command failed: ✗ instead of ✓ (TASK-82); blockId: of its echo
export const failCommand = (blockId: number): ActionFailCommand => ({
  type: ConsoleActionKind.FailCommand,
  payload: blockId,
});
export const finishTyping = (logId: number): ActionFinishTyping => ({
  type: ConsoleActionKind.FinishTyping,
  payload: logId,
});
// shows every log in full at once
export const skipTyping = (): ActionSkipTyping => ({ type: ConsoleActionKind.SkipTyping });
// covers the page with the `matrix` rain or a screensaver (TASK-95); null takes it away
export const setOverlay = (overlay: OverlayId | null): ActionSetOverlay => ({
  type: ConsoleActionKind.SetOverlay,
  payload: overlay,
});
// starts a mini-game over the console (TASK-66); null ends it
export const setGame = (game: RunningGame | null): ActionSetGame => ({
  type: ConsoleActionKind.SetGame,
  payload: game,
});
// `exit` (TASK-98): the screen goes out ("closing", then "closed"); null turns it on again
export const setShutdown = (shutdown: ShutdownPhase | null): ActionSetShutdown => ({
  type: ConsoleActionKind.SetShutdown,
  payload: shutdown,
});
let lastAchievementId = 0;
// the toast of a secret found for the first time (TASK-97); found: how many are found with it
export const showAchievement = (secret: SecretId, found: number): ActionShowAchievement => ({
  type: ConsoleActionKind.ShowAchievement,
  payload: { secret, found, id: ++lastAchievementId },
});
export const hideAchievement = (id: number): ActionHideAchievement => ({
  type: ConsoleActionKind.HideAchievement,
  payload: id,
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
export const setSoundMode = (soundMode: SoundMode): ActionSetSoundMode => ({
  type: ConsoleActionKind.SetSoundMode,
  payload: soundMode,
});
export const setFontMode = (fontMode: FontMode): ActionSetFontMode => ({
  type: ConsoleActionKind.SetFontMode,
  payload: fontMode,
});
export const setFontSize = (fontSize: number): ActionSetFontSize => ({
  type: ConsoleActionKind.SetFontSize,
  payload: fontSize,
});
export const setCommandsHint = (commandsHint: string[]): ActionSetCommandsHint => ({
  type: ConsoleActionKind.SetCommandsHint,
  payload: commandsHint,
});
