import React from "react";
import { useNavigate } from "react-router-dom";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import localization from "../localization";
import { ROUTES } from "../router/const";
import { addConsoleLog } from "../store/console/actions";

interface WithMainHandlerProps {
  children?: React.ReactNode;
}

const WithMainHandler: React.FC<WithMainHandlerProps> = ({ children }) => {
  const { consoleDispatch } = useConsoleContext();
  const navigate = useNavigate();

  const commandHandler = (command: string) => {
    if (command === "education") {
      consoleDispatch(addConsoleLog(localization.getLocale({ key: "education" })));
      return true;
    }

    if (command === "about") {
      consoleDispatch(addConsoleLog(localization.getLocale({ key: "about" })));
      return true;
    }

    if (command === "settings") {
      navigate(ROUTES.SETTINGS);
      return true;
    }

    return false;
  };

  return <HandlerContext.Provider value={{ commandHandler }}>{children}</HandlerContext.Provider>;
};

export default WithMainHandler;
