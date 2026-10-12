import { ConsoleActionKind, ConsoleActionType, ConsoleState } from "./interfaces";

// scrollback limit: older logs are dropped so a long session doesn't grow the DOM forever;
// a log is one command echo or one whole output (help is a single log), so this is
// roughly the last 250 commands, far more than a CV session needs
export const MAX_LOGS = 500;

export function reducer(state: ConsoleState, action: ConsoleActionType): ConsoleState {
  switch (action.type) {
    case ConsoleActionKind.AddLogs: {
      const { content, instant } = action.payload;
      const log = { content, id: state.nextLogId };
      const keptLogs =
        state.logs.length >= MAX_LOGS ? state.logs.slice(-(MAX_LOGS - 1)) : state.logs;
      return {
        ...state,
        logs: [...keptLogs, log],
        nextLogId: log.id + 1,
        // a dropped log can't be typed out: typing goes on from the oldest kept one
        typedLogId: instant ? log.id + 1 : Math.max(state.typedLogId, keptLogs[0]?.id ?? log.id),
      };
    }

    case ConsoleActionKind.ClearLogs: {
      return {
        ...state,
        logs: [],
        typedLogId: state.nextLogId,
      };
    }

    case ConsoleActionKind.AddHistoryCommand: {
      // checked here, not by the caller: two quick clicks on a command see the same stale state
      if (!action.payload || action.payload === state.history[0]) return state;
      return {
        ...state,
        history: [action.payload, ...state.history],
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

    case ConsoleActionKind.FinishTyping: {
      // a late timer of an already skipped log changes nothing
      if (action.payload < state.typedLogId) return state;
      return {
        ...state,
        typedLogId: action.payload + 1,
      };
    }

    case ConsoleActionKind.SkipTyping: {
      if (state.typedLogId === state.nextLogId) return state;
      return {
        ...state,
        typedLogId: state.nextLogId,
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
