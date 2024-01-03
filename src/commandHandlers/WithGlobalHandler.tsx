import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConsoleContext } from "../context/consoleContext";
import { GlobalHandlerContext } from "../context/globalHandlerContext";
import { usePathnameLocation } from "../hooks/usePathnameLocation";
import localization from "../localization";
import { ROUTES } from "../router/const";
import { addConsoleLog, clearLogs } from "../store/console/actions";

interface WithGlobalHandlerProps {
  children?: React.ReactNode;
}

enum GlobalComamnds {
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

    if ([GlobalComamnds.Back, "cd ..", "cd.."].includes(command)) {
      const prevLocation = location.pathname.split("/").at(-2) || "";
      navigate(`/${prevLocation}`);
      return true;
    }

    if (GlobalComamnds.Clear === command) {
      consoleDispatch(clearLogs());
      return true;
    }

    if ([GlobalComamnds.Menu, "exit"].includes(command)) {
      navigate(ROUTES.MAIN);
      return true;
    }

    if (GlobalComamnds.Help === command) {
      consoleDispatch(addConsoleLog(localization.getLocale({ key: "help" }), pathnameLocation));
      return true;
    }

    if (GlobalComamnds.Ls === command) {
      // TODO: make context ls (example: SettingsCommands)
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

  return (
    <GlobalHandlerContext.Provider value={{ commandHandler }}>
      {children}
    </GlobalHandlerContext.Provider>
  );
};

export default WithGlobalHandler;
