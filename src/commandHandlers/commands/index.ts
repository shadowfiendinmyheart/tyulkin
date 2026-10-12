import { ROUTES } from "../../router/const";
import { ConsoleRouteValues } from "../../router/interfaces";
import { Command } from "../interfaces";
import { mainCommands } from "./main";
import { settingsCommands } from "./settings";

export { globalCommands } from "./global";
export { secretCommands } from "./secrets";

export const commandsByRoute: Record<ConsoleRouteValues, Command[]> = {
  [ROUTES.MAIN]: mainCommands,
  [ROUTES.SETTINGS]: settingsCommands,
};
