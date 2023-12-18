import React from "react";
import { HandlerContextType } from "./interfaces";

export const GlobalHandlerContext = React.createContext<HandlerContextType | null>(null);

export const useGlobalHandlerContext = () => {
  const globalHandlerContext = React.useContext(GlobalHandlerContext);

  if (!globalHandlerContext) {
    throw new Error(
      "useGlobalHandlerContext has to be used within <GlobalHandlerContext.Provider>",
    );
  }

  return globalHandlerContext;
};
