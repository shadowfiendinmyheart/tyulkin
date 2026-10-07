import { Command } from "./interfaces";

const getCommandPhrases = ({ name, aliases = [] }: Command) => [name, ...aliases];

// matches whole words: "set themeblack" is not "set theme"
// the first matching command decides: with params it accepts at most one argument, without none
export const separateCommand = (commands: Command[], userCommand: string) => {
  const userWords = userCommand.trim().split(/\s+/);

  for (const command of commands) {
    for (const phrase of getCommandPhrases(command)) {
      const phraseWords = phrase.split(" ");
      if (!phraseWords.every((word, index) => userWords[index] === word)) continue;

      const params = userWords.slice(phraseWords.length);
      const maxParamsCount = command.params ? 1 : 0;
      if (params.length > maxParamsCount) return;

      return { command, params };
    }
  }
};

// "menu (exit) - return to the main menu"
export const getHelpLine = (command: Command, description: string) => {
  const aliases = command.aliases?.length ? ` (${command.aliases.join(", ")})` : "";
  return `${command.name}${aliases} - ${description}`;
};

export const getParamsString = (obj: object) => {
  return Object.values(obj).join(", ");
};

export const getAllCommandsWithParams = (commands: Command[]) => {
  return commands.flatMap((command) =>
    getCommandPhrases(command).flatMap((phrase) =>
      command.params ? command.params.map((param) => `${phrase} ${param}`) : [phrase],
    ),
  );
};

export const getAutocompleteCommands = (commands: string[], userCommand: string) => {
  return commands.filter((x) => x.startsWith(userCommand));
};
