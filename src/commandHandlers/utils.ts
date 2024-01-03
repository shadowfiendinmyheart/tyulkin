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
