import React from "react";
import { useHref, useLocation, useNavigate } from "react-router";
import { trackCommand, trackUnknownCommand } from "../analytics";
import { useAppContext } from "../context/appContext";
import { useConsoleContext } from "../context/consoleContext";
import { HandlerContext } from "../context/handlerContext";
import { HandlerContextType } from "../context/interfaces";
import { useLocalization } from "../context/localizationContext";
import { usePrompt } from "../hooks/usePrompt";
import {
  addConsoleLog,
  addHistoryCommand,
  addUserLog,
  failCommand,
  setCommandsHint,
} from "../store/console/actions";
import { ConsoleRouteValues } from "../router/interfaces";
import { LogNode } from "../store/console/interfaces";
import { withNode, withNodes } from "../store/console/logNodes";
import { commandsByRoute, globalCommands, secretCommands } from "./commands";
import { CommandContext } from "./interfaces";
import { isExistingPath } from "./fileSystem";
import { highlightLine } from "./highlight";
import { findHelpTarget, getManPage } from "./man";
import { getPaletteEntries } from "./palette";
import { findSecret } from "./secrets";
import { expandHistory, grep, parsePipeline } from "./shell";
import { getAllCommandsWithParams, getSuggestion, separateCommand } from "./utils";

interface WithCommandHandlerProps {
  // the page: its commands (global ones are always available); typed paths start from its
  // directory (highlighting, TASK-86)
  route: ConsoleRouteValues;
  children?: React.ReactNode;
}

const WithCommandHandler: React.FC<WithCommandHandlerProps> = ({ route, children }) => {
  const commands = commandsByRoute[route];
  const { consoleState, consoleDispatch } = useConsoleContext();
  const { caretMode, crtMode, soundMode, fontMode, fontSize, history } = consoleState;
  // read by `share`, `history` and `!!`: kept out of the deps, so the handlers don't change
  // after every command
  const historyRef = React.useRef(history);
  React.useLayoutEffect(() => {
    historyRef.current = history;
  }, [history]);
  const prompt = usePrompt();
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
    // fail: marks the block of the command ✗ (TASK-82); not through grep, the error may be filtered out
    (userCommand: string, fromLink: boolean, fail: () => void) => {
      if (userCommand.trim() === "") return;

      const rawLog: CommandContext["log"] = (content) => consoleDispatch(addConsoleLog(content));

      // "help | grep theme" (TASK-61): the command, then only the lines of its output with the word
      const pipeline = parsePipeline(userCommand);
      if (!pipeline) {
        rawLog({ type: "text", text: t({ key: "pipeUsage" }), color: "error" });
        fail();
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
      // "ls --help" (TASK-89): the manual of a command of the page, as `man ls`
      const helpTarget = findHelpTarget(commands, line);
      if (helpTarget) {
        trackCommand("man");
        log(getManPage(helpTarget.command, t));
        return;
      }

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
        fail();
        return;
      }

      trackCommand(separated.command.name);
      const ctx: CommandContext = {
        log,
        fail,
        t,
        language,
        theme,
        caretMode,
        crtMode,
        soundMode,
        fontMode,
        fontSize,
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
        const found = findSecret(command.secret);
        if (found) consoleDispatch(found);
      }
    },
    [
      availableCommands,
      t,
      language,
      theme,
      caretMode,
      crtMode,
      soundMode,
      fontMode,
      fontSize,
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
      // a click on the echoed line runs it again: expanded, or `!!` once more if nothing was found
      const echo = addUserLog(typed, prompt, command ?? typed);
      consoleDispatch(echo);
      const { blockId } = echo.payload.echo;
      const fail = () => consoleDispatch(failCommand(blockId));
      if (command === undefined) {
        consoleDispatch(
          addConsoleLog({ type: "text", text: t({ key: "historyNotFound" }), color: "error" }),
        );
        fail();
        return;
      }
      // the history keeps the expanded command, and it is shown as in bash
      consoleDispatch(addHistoryCommand(command));
      if (command !== typed) consoleDispatch(addConsoleLog(command));
      commandHandler(command, fromLink, fail);
    },
    [consoleDispatch, prompt, commandHandler, t],
  );

  // fish-like highlighting of the typed line (TASK-86), matched as commandHandler matches it:
  // easter eggs run, so they are commands too
  const hasHistory = history.length > 0;
  const highlight = React.useCallback<HandlerContextType["highlight"]>(
    (line) =>
      highlightLine(
        {
          commandLists: [availableCommands, secretCommands],
          hasHistory,
          // as typed, quotes included: the file system commands don't unquote their argument
          isPath: (typed) => isExistingPath(route, typed),
        },
        line,
      ),
    [availableCommands, hasHistory, route],
  );

  // completions come from allCommands; one that separateCommand doesn't match gets no description
  const describeCompletion = React.useCallback<HandlerContextType["describeCompletion"]>(
    (completion) => separateCommand(availableCommands, completion)?.command.descriptionKey,
    [availableCommands],
  );

  const paletteEntries = React.useMemo(
    () => getPaletteEntries(availableCommands),
    [availableCommands],
  );

  const handlerContextValue = React.useMemo(
    () => ({ executeCommand, allCommands, describeCompletion, highlight, paletteEntries }),
    [executeCommand, allCommands, describeCompletion, highlight, paletteEntries],
  );

  return <HandlerContext.Provider value={handlerContextValue}>{children}</HandlerContext.Provider>;
};

export default WithCommandHandler;
