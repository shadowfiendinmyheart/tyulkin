import { ConsoleActionKind, ConsoleActionType, ConsoleState } from "./interfaces";

export function reducer(state: ConsoleState, action: ConsoleActionType): ConsoleState {
  switch (action.type) {
  case ConsoleActionKind.AddLogs: {
    return {
      ...state,
      logs: [...state.logs, action.payload],
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
      userCommands: [action.payload, ...state.userCommands],
    };
  }

  case ConsoleActionKind.ChangeCurrentHistoryCommand: {
    return {
      ...state,
      userCommands: [action.payload, ...state.userCommands.slice(1)],
    };
  }

  case ConsoleActionKind.SetCaretMode: {
    return {
      ...state,
      caretMode: action.payload,
    };
  }

  case ConsoleActionKind.SetCommandsHint: {
    if (action.payload.length === 1) return { ...state, commandsHint: [] };

    return {
      ...state,
      commandsHint: action.payload,
    };
  }
  }
}
