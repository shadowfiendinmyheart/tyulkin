import React from "react";
import { useNavigate } from "react-router-dom";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { usePathnameLocation } from "../hooks/usePathnameLocation";
import localization from "../localization";
import { ROUTES } from "../router/const";
import { addConsoleLog } from "../store/console/actions";

interface WithMainHandlerProps {
  children?: React.ReactNode;
}

enum MainCommands {
  Education = "education",
  About = "about",
  Settings = "settings",
}

const WithMainHandler: React.FC<WithMainHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const pathnameLocation = usePathnameLocation();
  const navigate = useNavigate();

  const commandHandler = (command: string) => {
    if (MainCommands.Education === command) {
      consoleDispatch(
        addConsoleLog(localization.getLocale({ key: "education" }), pathnameLocation),
      );
      return true;
    }

    if (MainCommands.About === command) {
      consoleDispatch(addConsoleLog(localization.getLocale({ key: "about" }), pathnameLocation));
      return true;
    }

    if (MainCommands.Settings === command) {
      navigate(ROUTES.SETTINGS);
      return true;
    }

    return false;
  };

  return <HandlerContext.Provider value={{ commandHandler }}>{children}</HandlerContext.Provider>;
};

export default WithMainHandler;
