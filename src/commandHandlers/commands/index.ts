import { ROUTES } from "../../router/const";
import { RouteValues } from "../../router/interfaces";
import { Command } from "../interfaces";
import { mainCommands } from "./main";
import { settingsCommands } from "./settings";

export { globalCommands } from "./global";

export const commandsByRoute: Record<RouteValues, Command[]> = {
  [ROUTES.MAIN]: mainCommands,
  [ROUTES.SETTINGS]: settingsCommands,
};
