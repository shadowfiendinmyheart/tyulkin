import { AppActionKind, AppActionType, AppState } from "./interfaces";

export function reducer(state: AppState, action: AppActionType): AppState {
  switch (action.type) {
    case AppActionKind.SetStatus: {
      return {
        ...state,
        status: action.payload,
      };
    }

    case AppActionKind.SetTheme: {
      return {
        ...state,
        theme: action.payload,
      };
    }

    case AppActionKind.SetPreviewTheme: {
      return {
        ...state,
        previewTheme: action.payload,
      };
    }
  }
}
