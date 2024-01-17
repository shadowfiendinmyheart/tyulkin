import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConsoleContext } from "../context/consoleContext";
import { GlobalHandlerContext } from "../context/globalHandlerContext";
import { usePathnameLocation } from "../hooks/usePathnameLocation";
import localization from "../localization";
import { ROUTES } from "../router/const";
import { RouteValues } from "../router/interfaces";
import { addConsoleLog, clearLogs } from "../store/console/actions";
import { commandsByRoute, getAllCommandsWithParams } from "./utils";

interface WithGlobalHandlerProps {
  children?: React.ReactNode;
}

enum GlobalCommands {
  Back = "back",
  Clear = "clear",
  Menu = "menu",
  Help = "help",
  Ls = "ls",
}

const WithGlobalHandler: React.FC<WithGlobalHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const pathnameLocation = usePathnameLocation();
  const navigate = useNavigate();
  const location = useLocation();

  const commandHandler = (command: string) => {
    if (command === "") {
      return true;
    }

    if ([GlobalCommands.Back, "cd ..", "cd.."].includes(command)) {
      const prevLocation = location.pathname.split("/").at(-2) || "";
      navigate(`/${prevLocation}`);
      return true;
    }

    if (GlobalCommands.Clear === command) {
      consoleDispatch(clearLogs());
      return true;
    }

    if ([GlobalCommands.Menu, "exit"].includes(command)) {
      navigate(ROUTES.MAIN);
      return true;
    }

    if (GlobalCommands.Help === command) {
      consoleDispatch(addConsoleLog(localization.getLocale({ key: "help" }), pathnameLocation));
      return true;
    }

    if (GlobalCommands.Ls === command) {
      const globalCommands = Object.values(GlobalCommands);
      const route = location.pathname as RouteValues;
      const locationCommands = Object.values(commandsByRoute[route]);
      const allAvailableCommands = [...locationCommands, ...globalCommands].sort().join("   ");
      consoleDispatch(addConsoleLog(allAvailableCommands, pathnameLocation));
      return true;
    }

    consoleDispatch(
      addConsoleLog(
        localization.getLocale({ key: "404command", args: { unknownCommand: command } }),
        pathnameLocation,
      ),
    );
    return false;
  };

  const allCommands = getAllCommandsWithParams(
    Object.values(GlobalCommands).map((command) => ({ command })),
  );

  return (
    <GlobalHandlerContext.Provider value={{ commandHandler, allCommands }}>
      {children}
    </GlobalHandlerContext.Provider>
  );
};

export default WithGlobalHandler;
