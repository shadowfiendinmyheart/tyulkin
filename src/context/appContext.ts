import React from "react";
import { AppActionType, AppState } from "../store/app/interfaces";

export interface AppContextType {
  appState: AppState;
  appDispatch: (action: AppActionType) => void;
}

export const AppContext = React.createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const appContext = React.useContext(AppContext);

  if (!appContext) {
    throw new Error("useAppContext has to be used within <AppContext.Provider>");
  }

  return appContext;
};
