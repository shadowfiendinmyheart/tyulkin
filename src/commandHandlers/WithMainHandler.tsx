import React from "react";
import { useNavigate } from "react-router-dom";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import localization from "../localization";
import { ROUTES } from "../router/const";
import { addConsoleLog } from "../store/console/actions";
import { getAllCommandsWithParams } from "./utils";

interface WithMainHandlerProps {
  children?: React.ReactNode;
}

export enum MainCommands {
  Education = "education",
  About = "about",
  Settings = "settings",
}

const WithMainHandler: React.FC<WithMainHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const navigate = useNavigate();

  const commandHandler = (command: string) => {
    if (MainCommands.Education === command) {
      consoleDispatch(addConsoleLog(localization.getLocale({ key: "education" })));
      return true;
    }

    if (MainCommands.About === command) {
      consoleDispatch(addConsoleLog(localization.getLocale({ key: "about" })));
      return true;
    }

    if ([MainCommands.Settings, `cd ${MainCommands.Settings}`].includes(command)) {
      navigate(ROUTES.SETTINGS);
      return true;
    }

    return false;
  };

  const allCommands = getAllCommandsWithParams(
    Object.values(MainCommands).map((command) => ({ command })),
  );

  return (
    <HandlerContext.Provider value={{ commandHandler, allCommands }}>
      {children}
    </HandlerContext.Provider>
  );
};

export default WithMainHandler;
