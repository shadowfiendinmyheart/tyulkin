import { ROUTES } from "../../router/const";
import { clearLogs, setMatrixShown } from "../../store/console/actions";
import { LogNode } from "../../store/console/interfaces";
import { joinNodes, withNode } from "../../store/console/logNodes";
import { Command } from "../interfaces";
import { getNeofetch } from "../neofetch";
import { getCommandLink, getHelpRow, getParentPath, getShareableCommand } from "../utils";

export const globalCommands: Command[] = [
  {
    name: "back",
    aliases: ["cd ..", "cd.."],
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
    run: ({ consoleDispatch }) => consoleDispatch(clearLogs()),
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
    name: "ls",
    descriptionKey: "helpLs",
    run: ({ log, commands }) => {
      const names = commands.map(({ name }) => name).sort();
      log(
        joinNodes(
          names.map((name): LogNode => ({ type: "command", command: name })),
          "   ",
        ),
      );
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
    // the digital rain over the page until any key or tap (TASK-65)
    name: "matrix",
    descriptionKey: "helpMatrix",
    // logs nothing, and a link would cover the recipient's page at once
    shareable: false,
    run: ({ consoleDispatch }) => consoleDispatch(setMatrixShown(true)),
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
