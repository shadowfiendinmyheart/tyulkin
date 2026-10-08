import { ConsoleActionKind, ConsoleActionType, ConsoleState } from "./interfaces";

// scrollback limit: older logs are dropped so a long session doesn't grow the DOM forever;
// a log is one command echo or one whole output (help is a single log), so this is
// roughly the last 250 commands, far more than a CV session needs
export const MAX_LOGS = 500;

export function reducer(state: ConsoleState, action: ConsoleActionType): ConsoleState {
  switch (action.type) {
    case ConsoleActionKind.AddLogs: {
      const log = { ...action.payload, id: state.nextLogId };
      const keptLogs =
        state.logs.length >= MAX_LOGS ? state.logs.slice(-(MAX_LOGS - 1)) : state.logs;
      return {
        ...state,
        logs: [...keptLogs, log],
        nextLogId: state.nextLogId + 1,
      };
    }

    case ConsoleActionKind.ClearLogs: {
      return {
        ...state,
        logs: [],
      };
    }

    case ConsoleActionKind.AddHistoryCommand: {
      return {
        ...state,
        history: [action.payload, ...state.history],
      };
    }

    case ConsoleActionKind.SetCaretMode: {
      return {
        ...state,
        caretMode: action.payload,
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
