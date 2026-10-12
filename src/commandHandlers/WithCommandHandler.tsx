import React from "react";
import { useLocation, useNavigate } from "react-router";
import { useAppContext } from "../context/appContext";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { useLocalization } from "../context/localizationContext";
import { usePathnameLocation } from "../hooks/usePathnameLocation";
import {
  addConsoleLog,
  addHistoryCommand,
  addUserLog,
  setCommandsHint,
} from "../store/console/actions";
import { LogNode } from "../store/console/interfaces";
import { withNode, withNodes } from "../store/console/logNodes";
import { globalCommands } from "./commands";
import { Command, CommandContext } from "./interfaces";
import { getAllCommandsWithParams, getSuggestion, separateCommand } from "./utils";

interface WithCommandHandlerProps {
  // commands of the current page; global commands are always available
  commands: Command[];
  children?: React.ReactNode;
}

const WithCommandHandler: React.FC<WithCommandHandlerProps> = ({ commands, children }) => {
  const { consoleState, consoleDispatch } = useConsoleContext();
  const { caretMode } = consoleState;
  const pathnameLocation = usePathnameLocation();
  const { appState, appDispatch } = useAppContext();
  const { theme } = appState;
  const { t, language, changeLanguage } = useLocalization();
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
        const content = withNodes(
          ([help, ls]) => t({ key: "404command", args: { unknownCommand: userCommand, help, ls } }),
          [
            { type: "command", command: "help" },
            { type: "command", command: "ls" },
          ],
        ).map((node): LogNode =>
          typeof node === "string" ? { type: "text", text: node, color: "error" } : node,
        );
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
        language,
        theme,
        caretMode,
        changeLanguage,
        consoleDispatch,
        appDispatch,
        navigate,
        pathname,
        commands: availableCommands,
      };
      separated.command.run(ctx, separated.params);
    },
    [
      availableCommands,
      t,
      language,
      theme,
      caretMode,
      changeLanguage,
      consoleDispatch,
      appDispatch,
      navigate,
      pathname,
    ],
  );

  // shared by Enter in the input and clicks on commands in logs
  const executeCommand = React.useCallback(
    (userCommand: string) => {
      const command = userCommand.trim();
      consoleDispatch(addHistoryCommand(command));
      consoleDispatch(setCommandsHint([]));
      consoleDispatch(addUserLog(command, pathnameLocation));
      commandHandler(command);
    },
    [consoleDispatch, pathnameLocation, commandHandler],
  );

  const handlerContextValue = React.useMemo(
    () => ({ executeCommand, allCommands }),
    [executeCommand, allCommands],
  );

  return <HandlerContext.Provider value={handlerContextValue}>{children}</HandlerContext.Provider>;
};

export default WithCommandHandler;
