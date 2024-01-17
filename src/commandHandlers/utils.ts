import React from "react";
import { ROUTES } from "../router/const";
import { RouteValues } from "../router/interfaces";
import { CommandWithParams } from "./interfaces";
import WithMainHandler, { MainCommands } from "./WithMainHandler";
import WithSettingsHandler, { SettingsCommands } from "./WithSettingsHandler";

export const logWrapper = (userCommand: string, log: string) => `${userCommand}\n\n${log}\n\n`;

export const separateCommand = (commands: string[] | object, userCommand: string) => {
  const commandValues = Object.values(commands);
  userCommand = userCommand.trim();

  const foundCommand = commandValues.find((command) => userCommand.startsWith(command));
  if (!foundCommand) return;

  const userParams =
    userCommand.length > foundCommand.length
      ? userCommand.slice(foundCommand.length + 1).split(" ")
      : [];

  return {
    command: foundCommand,
    params: userParams,
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
