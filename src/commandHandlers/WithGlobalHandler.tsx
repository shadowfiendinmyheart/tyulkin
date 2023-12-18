import React from "react";
import { useNavigate } from "react-router-dom";
import { useConsoleContext } from "../context/consoleContext";
import { GlobalHandlerContext } from "../context/globalHandlerContext";
import localization from "../localization";
import { addConsoleLog, clearLogs } from "../store/console/actions";
import { logWrapper, unknownCommandText } from "./utils";

interface WithGlobalHandlerProps {
  children?: React.ReactNode;
}

const WithGlobalHandler: React.FC<WithGlobalHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const navigate = useNavigate();

  const commandHandler = (command: string) => {
    if (command === "") {
      return true;
    }

    if (command === "back" || command === "cd .." || command === "cd..") {
      navigate(-1);
      return true;
    }

    if (command === "clear") {
      consoleDispatch(clearLogs());
      return true;
    }

    if (command === "help") {
      consoleDispatch(addConsoleLog(localization.getLocale("help")));
      return true;
    }

    if (command === "ls") {
      // TODO: make context ls (example: SettingsCommands)
      consoleDispatch(addConsoleLog(localization.getLocale("404command")));
      return true;
    }

    consoleDispatch(addConsoleLog(unknownCommandText(command)));
    return false;
  };

  return (
    <GlobalHandlerContext.Provider value={{ commandHandler }}>
      {children}
    </GlobalHandlerContext.Provider>
  );
};

export default WithGlobalHandler;
