import { ROUTES } from "../../router/const";
import { clearHistory, clearLogs, setMatrixShown } from "../../store/console/actions";
import { withNode } from "../../store/console/logNodes";
import { Command } from "../interfaces";
import { stopAsk } from "../ask";
import { gameCommands } from "./games";
import { getNeofetch } from "../neofetch";
import { getSecretsLog } from "../secrets";
import { formatDate, formatHistory, getWorkingDirectory, unquote, USER_NAME } from "../shell";
import { getCommandLink, getHelpRow, getParentPath, getShareableCommand } from "../utils";

export const globalCommands: Command[] = [
  {
    name: "back",
    // "cd .." is `cd` (commands/fileSystem.ts)
    aliases: ["cd.."],
    descriptionKey: "helpBack",
    shareable: false,
    run: ({ navigate, pathname }) => {
      navigate(getParentPath(pathname));
    },
  },
  {
    name: "clear",
    descriptionKey: "helpClear",
    shareable: false,
    run: ({ consoleDispatch }) => {
      // an answer of `ask` would go on printing into the cleared console
      stopAsk();
      consoleDispatch(clearLogs());
    },
  },
  {
    name: "menu",
    aliases: ["exit"],
    descriptionKey: "helpMenu",
    shareable: false,
    run: ({ navigate }) => navigate(ROUTES.MAIN),
  },
  {
    name: "help",
    descriptionKey: "helpHelp",
    run: ({ log, t, commands }) => {
      const rows = commands.map((command) =>
        getHelpRow(command, t({ key: command.descriptionKey })),
      );
      log({ type: "table", rows });
    },
  },
  {
    name: "gui",
    descriptionKey: "helpGui",
    shareable: false,
    run: ({ navigate }) => navigate(ROUTES.GUI),
  },
  {
    name: "neofetch",
    descriptionKey: "helpNeofetch",
    run: ({ log, t, language, theme, caretMode }) =>
      log(getNeofetch({ t, language, theme, caretMode, now: new Date() })),
  },
  {
    // the executed commands (TASK-61), kept between visits; `history -c` forgets them
    name: "history",
    anyArgs: true,
    descriptionKey: "helpHistory",
    // a link would show the recipient's own history
    shareable: false,
    run: ({ log, t, history, consoleDispatch }, args) => {
      if (args.length === 1 && args[0] === "-c") {
        consoleDispatch(clearHistory());
        log({ type: "text", text: t({ key: "historyCleared" }), color: "muted" });
      } else if (args.length) {
        log(t({ key: "historyUsage" }));
      } else if (history.length) {
        log({ type: "pre", text: formatHistory(history) });
      } else {
        log({ type: "text", text: t({ key: "historyEmpty" }), color: "muted" });
      }
    },
  },
  {
    // the visitor's text, as typed: plain text, never a link or a command
    name: "echo",
    anyArgs: true,
    descriptionKey: "helpEcho",
    shareable: false,
    linkable: false,
    run: ({ log }, args) => log(unquote(args.join(" "))),
  },
  {
    name: "whoami",
    descriptionKey: "helpWhoami",
    run: ({ log }) => log(USER_NAME),
  },
  {
    name: "pwd",
    descriptionKey: "helpPwd",
    run: ({ log, pathname }) => log(getWorkingDirectory(pathname)),
  },
  {
    name: "date",
    descriptionKey: "helpDate",
    run: ({ log, language }) => log(formatDate(new Date(), language)),
  },
  {
    // the digital rain over the page until any key or tap (TASK-65)
    name: "matrix",
    descriptionKey: "helpMatrix",
    // logs nothing, and a link would cover the recipient's page at once
    shareable: false,
    run: ({ consoleDispatch }) => consoleDispatch(setMatrixShown(true)),
  },
  ...gameCommands,
  {
    // how many easter eggs the visitor has found (TASK-63)
    name: "secrets",
    descriptionKey: "helpSecrets",
    run: ({ log, t }) => log(getSecretsLog(t)),
  },
  {
    // copies a deep link that opens the current page with the latest command run (TASK-62)
    name: "share",
    descriptionKey: "helpShare",
    shareable: false,
    run: ({ log, t, commands, history, pageHref }) => {
      const command = getShareableCommand(commands, history);
      if (!command) {
        log(
          withNode((help) => t({ key: "shareNothing", args: { help } }), {
            type: "command",
            command: "help",
          }),
        );
        return;
      }
      const link = getCommandLink(new URL(pageHref, window.location.href).toString(), command);
      // the link is plain text: the command in it was typed by the visitor
      const logNotCopied = () => log(t({ key: "shareNotCopied", args: { command, link } }));
      if (!navigator.clipboard) {
        logNotCopied();
        return;
      }
      navigator.clipboard
        .writeText(link)
        .then(() => log(t({ key: "shareCopied", args: { command, link } })))
        .catch(logNotCopied);
    },
  },
];
