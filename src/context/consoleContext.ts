import React from "react";
import { ConsoleActionType, ConsoleState } from "../store/console/interfaces";

export interface InputContextType {
  consoleState: ConsoleState;
  consoleDispatch: (action: ConsoleActionType) => void;
}

export const ConsoleContext = React.createContext<InputContextType | null>(null);

export const useConsoleContext = () => {
  const consoleContext = React.useContext(ConsoleContext);

  if (!consoleContext) {
    throw new Error("useConsoleContext has to be used within <ConsoleContext.Provider>");
  }

  return consoleContext;
};
