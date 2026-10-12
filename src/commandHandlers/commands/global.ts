import { ROUTES } from "../../router/const";
import { clearLogs } from "../../store/console/actions";
import { LogNode } from "../../store/console/interfaces";
import { joinNodes } from "../../store/console/logNodes";
import { Command } from "../interfaces";
import { getHelpRow, getParentPath } from "../utils";

export const globalCommands: Command[] = [
  {
    name: "back",
    aliases: ["cd ..", "cd.."],
    descriptionKey: "helpBack",
    run: ({ navigate, pathname }) => {
      navigate(getParentPath(pathname));
    },
  },
  {
    name: "clear",
    descriptionKey: "helpClear",
    run: ({ consoleDispatch }) => consoleDispatch(clearLogs()),
  },
  {
    name: "menu",
    aliases: ["exit"],
    descriptionKey: "helpMenu",
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
];
