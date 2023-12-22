import React from "react";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { usePathnameLocation } from "../hooks/usePathnameLocation";
import { addConsoleLog } from "../store/console/actions";

interface WithEducationHandlerProps {
  children?: React.ReactNode;
}

const WithEducationHandler: React.FC<WithEducationHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const pathnameLocation = usePathnameLocation();

  const commandHandler = (command: string) => {
    if (command === "back") {
      consoleDispatch(addConsoleLog("move u back to main...", pathnameLocation));
      return true;
    }

    return false;
  };

  return <HandlerContext.Provider value={{ commandHandler }}>{children}</HandlerContext.Provider>;
};

export default WithEducationHandler;
