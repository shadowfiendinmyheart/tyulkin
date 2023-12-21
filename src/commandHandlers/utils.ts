export const logWrapper = (userCommand: string, log: string) => `${userCommand}\n\n${log}\n\n`;

export const separateCommand = (commands: string[] | object, userCommand: string) => {
  let transformedCommands = [];
  // TODO
  if (typeof commands === "object" && !Array.isArray(commands) && commands !== null) {
    transformedCommands = Object.values(commands);
  } else {
    transformedCommands = commands;
  }

  let finalCommand = "";
  for (const command of transformedCommands) {
    if (userCommand.trim().startsWith(command)) {
      finalCommand = command;
      break;
    }
  }
  if (!finalCommand) return;

  const userParams =
    userCommand.length > finalCommand.length
      ? userCommand.slice(finalCommand.length + 1).split(" ")
      : [];

  return {
    command: finalCommand,
    params: userParams,
  };
};
