export const logWrapper = (userCommand: string, log: string) => `${userCommand}\n\n${log}\n\n`;

export const separateCommand = (commands: string[] | object, userCommand: string) => {
  let commandValues = Object.values(commands);
  userCommand = userCommand.trim();

  let findedCommand = commandValues.find((command) => userCommand.startsWith(command));
  if (!findedCommand) return;

  const userParams =
    userCommand.length > findedCommand.length
      ? userCommand.slice(findedCommand.length + 1).split(" ")
      : [];

  return {
    command: findedCommand,
    params: userParams,
  };
};

export const getParamsString = (obj: object) => {
  return Object.values(obj).join(", ");
};

export interface CommandWithParams {
  command: string;
  params?: string[];
}
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
