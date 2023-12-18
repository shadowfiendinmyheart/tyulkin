import React from "react";
import { HandlerContextType } from "./interfaces";

export const HandlerContext = React.createContext<HandlerContextType | null>(null);

export const useHandlerContext = () => {
  const handlerContext = React.useContext(HandlerContext);

  if (!handlerContext) {
    throw new Error("useHandlerContext has to be used within <HandlerContext.Provider>");
  }

  return handlerContext;
};
