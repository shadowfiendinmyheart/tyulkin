import { HISTORY_LIMIT } from "../../domain";
import { ConsoleActionKind, ConsoleActionType, ConsoleState, Log } from "./interfaces";

// scrollback limit: older logs are dropped so a long session doesn't grow the DOM forever;
// a log is one command echo or one whole output (help is a single log), so this is
// roughly the last 250 commands, far more than a CV session needs
export const MAX_LOGS = 500;

// where a log of the block goes (TASK-102): before the echo of the next block, the end when the
// block is the latest one. A block that is gone (Ctrl+L, dropped) is older than every kept one:
// its log goes before the first kept echo, not into the block of a newer command
// start: the index of its echo (findEchoIndex)
const getBlockEnd = (logs: Log[], blockId: number | undefined, start: number) => {
  if (blockId === undefined) return logs.length;
  const end = logs.findIndex((log, index) => index > start && log.echo);
  return end === -1 ? logs.length : end;
};

// the index of the echo of the block, -1 when it is gone; searched from the end: the block is
// most likely one of the latest
const findEchoIndex = (logs: Log[], blockId: number) => {
  for (let index = logs.length - 1; index >= 0; index--) {
    if (logs[index].echo?.blockId === blockId) return index;
  }
  return -1;
};

// the log typed out next: the kept one with the smallest id from `from` on, nextLogId when none.
// Logs are not in the order of ids (a late log of an older block, TASK-102), and a dropped one
// can't be typed out
const getTypedLogId = (logs: Log[], from: number, nextLogId: number) =>
  logs.reduce((next, { id }) => (id >= from && id < next ? id : next), nextLogId);

export function reducer(state: ConsoleState, action: ConsoleActionType): ConsoleState {
  switch (action.type) {
    case ConsoleActionKind.AddLogs: {
      const { content, instant, echo, blockId } = action.payload;
      const keptLogs =
        state.logs.length >= MAX_LOGS ? state.logs.slice(-(MAX_LOGS - 1)) : state.logs;
      // the output of a block is of the page its command was run on, even if printed after `cd`
      // (`ask` streams on): its commands run there (TASK-103)
      const start = blockId === undefined ? -1 : findEchoIndex(keptLogs, blockId);
      const route = keptLogs[start]?.route ?? state.route;
      const log: Log = {
        content,
        id: state.nextLogId,
        ...(echo && { echo }),
        ...(route && { route }),
      };
      const end = getBlockEnd(keptLogs, blockId, start);
      const logs = [...keptLogs.slice(0, end), log, ...keptLogs.slice(end)];
      return {
        ...state,
        logs,
        nextLogId: log.id + 1,
        // a dropped log can't be typed out: typing goes on from the next kept one
        typedLogId: instant
          ? log.id + 1
          : keptLogs === state.logs
            ? state.typedLogId
            : getTypedLogId(logs, state.typedLogId, log.id + 1),
      };
    }

    case ConsoleActionKind.ClearLogs: {
      return {
        ...state,
        logs: [],
        typedLogId: state.nextLogId,
      };
    }

    case ConsoleActionKind.SetRoute: {
      if (action.payload === state.route) return state;
      return {
        ...state,
        route: action.payload,
      };
    }

    case ConsoleActionKind.FailCommand: {
      // a dropped block changes nothing
      const index = findEchoIndex(state.logs, action.payload);
      const echo = state.logs[index]?.echo;
      if (!echo || echo.failed) return state;
      const logs = [...state.logs];
      logs[index] = { ...state.logs[index], echo: { ...echo, failed: true } };
      return { ...state, logs };
    }

    case ConsoleActionKind.AddHistoryCommand: {
      // checked here, not by the caller: two quick clicks on a command see the same stale state
      if (!action.payload || action.payload === state.history[0]) return state;
      return {
        ...state,
        history: [action.payload, ...state.history].slice(0, HISTORY_LIMIT),
        historyAdded: state.historyAdded + 1,
      };
    }

    case ConsoleActionKind.ClearHistory: {
      if (!state.history.length) return state;
      return {
        ...state,
        history: [],
      };
    }

    case ConsoleActionKind.CountTypedCommand: {
      return {
        ...state,
        typedCommandsCount: state.typedCommandsCount + 1,
      };
    }

    case ConsoleActionKind.SetCaretMode: {
      return {
        ...state,
        caretMode: action.payload,
      };
    }

    case ConsoleActionKind.SetCrtMode: {
      return {
        ...state,
        crtMode: action.payload,
      };
    }

    case ConsoleActionKind.SetSoundMode: {
      return {
        ...state,
        soundMode: action.payload,
      };
    }

    case ConsoleActionKind.SetFontMode: {
      return {
        ...state,
        fontMode: action.payload,
      };
    }

    case ConsoleActionKind.SetFontSize: {
      return {
        ...state,
        fontSize: action.payload,
      };
    }

    case ConsoleActionKind.FinishTyping: {
      // a late timer of an already skipped log changes nothing
      if (action.payload < state.typedLogId) return state;
      return {
        ...state,
        // the next kept one: the log after this id may be dropped already (TASK-102)
        typedLogId: getTypedLogId(state.logs, action.payload + 1, state.nextLogId),
      };
    }

    case ConsoleActionKind.SkipTyping: {
      if (state.typedLogId === state.nextLogId) return state;
      return {
        ...state,
        typedLogId: state.nextLogId,
      };
    }

    case ConsoleActionKind.SetOverlay: {
      if (action.payload === state.overlay) return state;
      return {
        ...state,
        overlay: action.payload,
      };
    }

    case ConsoleActionKind.SetGame: {
      // the same game again: it goes on, its block stays the one that started it
      if (action.payload?.id === state.game?.id) return state;
      return {
        ...state,
        game: action.payload,
      };
    }

    case ConsoleActionKind.SetShutdown: {
      if (action.payload === state.shutdown) return state;
      return {
        ...state,
        shutdown: action.payload,
      };
    }

    case ConsoleActionKind.ShowAchievement: {
      return {
        ...state,
        achievement: action.payload,
      };
    }

    case ConsoleActionKind.HideAchievement: {
      if (state.achievement?.id !== action.payload) return state;
      return {
        ...state,
        achievement: null,
      };
    }

    case ConsoleActionKind.SetCommandsHint: {
      return {
        ...state,
        commandsHint: action.payload,
      };
    }
  }
}
