import React from "react";
import { useHref, useLocation, useNavigate } from "react-router";
import { trackCommand, trackUnknownCommand } from "../analytics";
import { useAppContext } from "../context/appContext";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { HandlerContextType } from "../context/interfaces";
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
import { globalCommands, secretCommands } from "./commands";
import { Command, CommandContext } from "./interfaces";
import { findSecret } from "./secrets";
import { getAllCommandsWithParams, getSuggestion, separateCommand } from "./utils";

interface WithCommandHandlerProps {
  // commands of the current page; global commands are always available
  commands: Command[];
  children?: React.ReactNode;
}

const WithCommandHandler: React.FC<WithCommandHandlerProps> = ({ commands, children }) => {
  const { consoleState, consoleDispatch } = useConsoleContext();
  const { caretMode, history } = consoleState;
  // read by `share` only: kept out of the deps, so the handlers don't change after every command
  const historyRef = React.useRef(history);
  React.useLayoutEffect(() => {
    historyRef.current = history;
  }, [history]);
  const pathnameLocation = usePathnameLocation();
  const { appState, appDispatch } = useAppContext();
  const { theme } = appState;
  const { t, language, changeLanguage } = useLocalization();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const href = useHref(pathname);
  // the basename has no trailing slash, so the root is "/tyulkin": a shared link gets the
  // canonical "/tyulkin/" and doesn't rely on the host redirect keeping the query
  const pageHref = pathname === "/" && !href.endsWith("/") ? `${href}/` : href;

  // page commands go first: they win over global ones and lead in help
  const availableCommands = React.useMemo(() => [...commands, ...globalCommands], [commands]);
  const allCommands = React.useMemo(
    () => getAllCommandsWithParams(availableCommands),
    [availableCommands],
  );

  const commandHandler = React.useCallback(
    (userCommand: string, fromLink: boolean) => {
      if (userCommand.trim() === "") return;

      const log: CommandContext["log"] = (content) => consoleDispatch(addConsoleLog(content));

      // easter eggs only when no command of the page or global one matches
      const separated =
        separateCommand(availableCommands, userCommand) ??
        (fromLink ? undefined : separateCommand(secretCommands, userCommand));
      if (!separated) {
        trackUnknownCommand(userCommand);
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

      trackCommand(separated.command.name);
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
        pageHref,
        history: historyRef.current,
        commands: availableCommands,
      };
      const { command, params } = separated;
      command.run(ctx, params);
      if ("secret" in command) {
        const found = findSecret(command.secret, t);
        if (found) log(found);
      }
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
      pageHref,
    ],
  );

  // shared by Enter in the input, clicks on commands in logs and deep links
  const executeCommand = React.useCallback<HandlerContextType["executeCommand"]>(
    (userCommand, { fromLink = false } = {}) => {
      const command = userCommand.trim();
      consoleDispatch(addHistoryCommand(command));
      consoleDispatch(setCommandsHint([]));
      consoleDispatch(addUserLog(command, pathnameLocation));
      commandHandler(command, fromLink);
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
