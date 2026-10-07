import React from "react";
import { ROUTES } from "../router/const";
import { RouteValues } from "../router/interfaces";
import { CommandWithParams } from "./interfaces";
import WithMainHandler, { MainCommands } from "./WithMainHandler";
import WithSettingsHandler, { SettingsCommands } from "./WithSettingsHandler";

export const logWrapper = (userCommand: string, log: string) => `${userCommand}\n\n${log}\n\n`;

// matches whole words: "set themeblack" is not "set theme"
// a command with params accepts at most one argument, a command without params accepts none
export const separateCommand = (commandsWithParams: CommandWithParams[], userCommand: string) => {
  const userWords = userCommand.trim().split(/\s+/);

  const found = commandsWithParams.find(({ command }) =>
    command.split(" ").every((word, index) => userWords[index] === word),
  );
  if (!found) return;

  const params = userWords.slice(found.command.split(" ").length);
  const maxParamsCount = found.params ? 1 : 0;
  if (params.length > maxParamsCount) return;

  return {
    command: found.command,
    params,
  };
};

export const getParamsString = (obj: object) => {
  return Object.values(obj).join(", ");
};

export const getAllCommandsWithParams = (commandsWithParams: CommandWithParams[]) => {
  return commandsWithParams.reduce<string[]>((prev, cur) => {
    const newCommands = cur.params
      ? cur.params.map((param) => cur.command + " " + param)
      : [cur.command];
    return [...prev, ...newCommands];
  }, []);
};

export const getAutocompleteCommands = (commands: string[], userCommand: string) => {
  return commands.filter((x) => x.startsWith(userCommand));
};

export const commandsByRoute: Record<RouteValues, object> = {
  [ROUTES.MAIN]: MainCommands,
  [ROUTES.SETTINGS]: SettingsCommands,
};
export const handlerByRoute: Record<RouteValues, React.FC> = {
  [ROUTES.MAIN]: WithMainHandler,
  [ROUTES.SETTINGS]: WithSettingsHandler,
};

export const getHelpLocaleArgs = (commandObject: object): Record<string, string> => {
  return Object.values(commandObject).reduce((prev, cur) => {
    return { ...prev, [cur]: cur };
  }, {});
};
