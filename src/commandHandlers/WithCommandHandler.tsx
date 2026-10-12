import React from "react";
import { useLocation, useNavigate } from "react-router";
import { useAppContext } from "../context/appContext";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { useLocalization } from "../context/localizationContext";
import { addConsoleLog } from "../store/console/actions";
import { LogNode } from "../store/console/interfaces";
import { withNode } from "../store/console/logNodes";
import { globalCommands } from "./commands";
import { Command, CommandContext } from "./interfaces";
import { getAllCommandsWithParams, getSuggestion, separateCommand } from "./utils";

interface WithCommandHandlerProps {
  // commands of the current page; global commands are always available
  commands: Command[];
  children?: React.ReactNode;
}

const WithCommandHandler: React.FC<WithCommandHandlerProps> = ({ commands, children }) => {
  const { consoleDispatch } = useConsoleContext();
  const { appDispatch } = useAppContext();
  const { t, changeLanguage } = useLocalization();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // page commands go first: they win over global ones and lead in help
  const availableCommands = React.useMemo(() => [...commands, ...globalCommands], [commands]);
  const allCommands = React.useMemo(
    () => getAllCommandsWithParams(availableCommands),
    [availableCommands],
  );

  const commandHandler = React.useCallback(
    (userCommand: string) => {
      if (userCommand.trim() === "") return;

      const log: CommandContext["log"] = (content) => consoleDispatch(addConsoleLog(content));

      const separated = separateCommand(availableCommands, userCommand);
      if (!separated) {
        const notFound = t({ key: "404command", args: { unknownCommand: userCommand } });
        const content: LogNode[] = [{ type: "text", text: notFound, color: "error" }];
        const suggestion = getSuggestion(availableCommands, userCommand);
        if (suggestion) {
          const didYouMean = withNode((command) => t({ key: "didYouMean", args: { command } }), {
            type: "command",
            command: suggestion,
          });
          content.push("\n", ...didYouMean);
        }
        log(content);
        return;
      }

      const ctx: CommandContext = {
        log,
        t,
        changeLanguage,
        consoleDispatch,
        appDispatch,
        navigate,
        pathname,
        commands: availableCommands,
      };
      separated.command.run(ctx, separated.params);
    },
    [availableCommands, t, changeLanguage, consoleDispatch, appDispatch, navigate, pathname],
  );

  const handlerContextValue = React.useMemo(
    () => ({ commandHandler, allCommands }),
    [commandHandler, allCommands],
  );

  return <HandlerContext.Provider value={handlerContextValue}>{children}</HandlerContext.Provider>;
};

export default WithCommandHandler;
