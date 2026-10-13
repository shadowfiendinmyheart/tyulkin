import { ROUTES } from "../../router/const";
import { ConsoleRouteValues } from "../../router/interfaces";
import { Command } from "../interfaces";
import { getFileSystemCommands } from "./fileSystem";
import { mainCommands } from "./main";
import { settingsCommands } from "./settings";

export { globalCommands } from "./global";
export { secretCommands } from "./secrets";

// every page is a directory (TASK-60): `ls`, `cd`, `cat` and `tree` work from it
export const commandsByRoute: Record<ConsoleRouteValues, Command[]> = {
  [ROUTES.MAIN]: [...mainCommands, ...getFileSystemCommands(ROUTES.MAIN)],
  [ROUTES.PROJECTS]: getFileSystemCommands(ROUTES.PROJECTS),
  [ROUTES.SETTINGS]: [...settingsCommands, ...getFileSystemCommands(ROUTES.SETTINGS)],
};
