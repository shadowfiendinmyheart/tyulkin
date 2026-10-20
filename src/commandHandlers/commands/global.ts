import { getRandomScreensaver, oneOf, screensaverIds } from "../../domain";
import { ROUTES } from "../../router/const";
import { clearHistory, clearLogs, setOverlay, setShutdown } from "../../store/console/actions";
import { withNode } from "../../store/console/logNodes";
import { Command } from "../interfaces";
import { stopAsk } from "../ask";
import { gameCommands } from "./games";
import { getNeofetch } from "../neofetch";
import { getManPage } from "../man";
import { QR_VCARD_PARAM, showQr, stopQr } from "../qr";
import { getSecretsLog } from "../secrets";
import { formatDate, formatHistory, getWorkingDirectory, unquote, USER_NAME } from "../shell";
import {
  getCommandLink,
  getParamsString,
  getHelpRow,
  getParentPath,
  getShareableCommand,
  separateCommand,
} from "../utils";

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
      // so is a QR code still loading
      stopQr();
      consoleDispatch(clearLogs());
    },
  },
  {
    name: "menu",
    descriptionKey: "helpMenu",
    shareable: false,
    run: ({ navigate }) => navigate(ROUTES.MAIN),
  },
  {
    // the screen goes out as a CRT does, then "[Process completed]" and a restart (TASK-98),
    // see ConsolePage
    name: "exit",
    descriptionKey: "helpExit",
    // a link would turn the recipient's page off at once
    shareable: false,
    run: ({ consoleDispatch }) => {
      // an answer of `ask` or a QR code still loading would print into the restarted console
      stopAsk();
      stopQr();
      consoleDispatch(setShutdown("closing"));
    },
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
    // the manual of a command of the page (TASK-89); `<command> --help` shows it too
    name: "man",
    anyArgs: true,
    descriptionKey: "helpMan",
    run: ({ log, fail, t, commands }, args) => {
      if (!args.length) {
        log(
          withNode((man) => t({ key: "manUsage", args: { man } }), {
            type: "command",
            command: "man man",
          }),
        );
        fail();
        return;
      }
      // "man set theme": a command may be several words
      const separated = separateCommand(commands, args.join(" "));
      if (!separated) {
        const command = args.join(" ");
        log({ type: "text", text: t({ key: "manNotFound", args: { command } }), color: "error" });
        fail();
        return;
      }
      log(getManPage(separated.command, t));
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
    run: ({ consoleDispatch }) => consoleDispatch(setOverlay("matrix")),
  },
  {
    // a screensaver over the page until any key or tap (TASK-95); it also starts by itself after
    // a while without input, see ConsolePage. Without an argument: any of them
    name: "screensaver",
    params: screensaverIds,
    descriptionKey: "helpScreensaver",
    // a link would cover the recipient's page at once
    shareable: false,
    run: ({ log, fail, t, consoleDispatch }, [param]) => {
      const screensaver = param
        ? oneOf(screensaverIds, param.toLowerCase())
        : getRandomScreensaver();
      if (!screensaver) {
        log(
          t({
            key: "wrongScreensaver",
            args: { screensaverName: param, screensavers: getParamsString(screensaverIds) },
          }),
        );
        fail();
        return;
      }
      consoleDispatch(setOverlay(screensaver));
    },
  },
  {
    // a QR code of the site address, or of the contacts as a vCard (TASK-96)
    name: "qr",
    params: [QR_VCARD_PARAM],
    descriptionKey: "helpQr",
    run: ({ log, fail, t }, [param]) => void showQr({ t, param, log, fail }),
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
