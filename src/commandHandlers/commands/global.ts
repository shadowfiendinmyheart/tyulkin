import { ROUTES } from "../../router/const";
import { clearLogs } from "../../store/console/actions";
import { Command } from "../interfaces";
import { getHelpLine } from "../utils";

export const globalCommands: Command[] = [
  {
    name: "back",
    aliases: ["cd ..", "cd.."],
    descriptionKey: "helpBack",
    run: ({ navigate, pathname }) => {
      const prevLocation = pathname.split("/").at(-2) || "";
      navigate(`/${prevLocation}`);
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
      const help = commands.map((command) =>
        getHelpLine(command, t({ key: command.descriptionKey })),
      );
      log(help.join("\n"));
    },
  },
  {
    name: "ls",
    descriptionKey: "helpLs",
    run: ({ log, commands }) => {
      log(
        commands
          .map(({ name }) => name)
          .sort()
          .join("   "),
      );
    },
  },
];
