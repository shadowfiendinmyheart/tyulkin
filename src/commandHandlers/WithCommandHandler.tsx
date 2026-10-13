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
import { expandHistory, grep, parsePipeline } from "./shell";
import { getAllCommandsWithParams, getSuggestion, separateCommand } from "./utils";

interface WithCommandHandlerProps {
  // commands of the current page; global commands are always available
  commands: Command[];
  children?: React.ReactNode;
}

const WithCommandHandler: React.FC<WithCommandHandlerProps> = ({ commands, children }) => {
  const { consoleState, consoleDispatch } = useConsoleContext();
  const { caretMode, crtMode, history } = consoleState;
  // read by `share`, `history` and `!!`: kept out of the deps, so the handlers don't change
  // after every command
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

      const rawLog: CommandContext["log"] = (content) => consoleDispatch(addConsoleLog(content));

      // "help | grep theme" (TASK-61): the command, then only the lines of its output with the word
      const pipeline = parsePipeline(userCommand);
      if (!pipeline) {
        rawLog({ type: "text", text: t({ key: "pipeUsage" }), color: "error" });
        return;
      }
      const { command: line, filters } = pipeline;
      const log: CommandContext["log"] = filters.length
        ? (content) => {
            const nodes = filters.reduce(grep, Array.isArray(content) ? content : [content]);
            if (nodes.length) rawLog(nodes);
          }
        : rawLog;

      // easter eggs only when no command of the page or global one matches
      const commands = fromLink
        ? availableCommands.filter(({ linkable }) => linkable !== false)
        : availableCommands;
      const separated =
        separateCommand(commands, line) ??
        (fromLink ? undefined : separateCommand(secretCommands, line));
      if (!separated) {
        trackUnknownCommand(line);
        const content = withNodes(
          ([help, ls]) => t({ key: "404command", args: { unknownCommand: line, help, ls } }),
          [
            { type: "command", command: "help" },
            { type: "command", command: "ls" },
          ],
        ).map((node): LogNode =>
          typeof node === "string" ? { type: "text", text: node, color: "error" } : node,
        );
        const suggestion = getSuggestion(commands, line);
        if (suggestion) {
          const didYouMean = withNode((command) => t({ key: "didYouMean", args: { command } }), {
            type: "command",
            command: suggestion,
          });
          content.push("\n", ...didYouMean);
        }
        rawLog(content);
        return;
      }

      trackCommand(separated.command.name);
      const ctx: CommandContext = {
        log,
        t,
        language,
        theme,
        caretMode,
        crtMode,
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
        if (found) rawLog(found);
      }
    },
    [
      availableCommands,
      t,
      language,
      theme,
      caretMode,
      crtMode,
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
      const typed = userCommand.trim();
      // `!!` is the previous command (TASK-61); a link runs what it says
      const command = fromLink ? typed : expandHistory(typed, historyRef.current[0]);
      consoleDispatch(setCommandsHint([]));
      consoleDispatch(addUserLog(typed, pathnameLocation));
      if (command === undefined) {
        consoleDispatch(
          addConsoleLog({ type: "text", text: t({ key: "historyNotFound" }), color: "error" }),
        );
        return;
      }
      // the history keeps the expanded command, and it is shown as in bash
      consoleDispatch(addHistoryCommand(command));
      if (command !== typed) consoleDispatch(addConsoleLog(command));
      commandHandler(command, fromLink);
    },
    [consoleDispatch, pathnameLocation, commandHandler, t],
  );

  const handlerContextValue = React.useMemo(
    () => ({ executeCommand, allCommands }),
    [executeCommand, allCommands],
  );

  return <HandlerContext.Provider value={handlerContextValue}>{children}</HandlerContext.Provider>;
};

export default WithCommandHandler;
