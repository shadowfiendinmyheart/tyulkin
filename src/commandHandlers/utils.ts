import { Command } from "./interfaces";

const getCommandPhrases = ({ name, aliases = [] }: Command) => [name, ...aliases];

// matches whole words case-insensitively: "Help" is "help", "set themeblack" is not "set theme";
// params are returned as typed, commands normalize them themselves
// the first matching command decides: with params it accepts at most one argument, without none
export const separateCommand = (commands: Command[], userCommand: string) => {
  const userWords = userCommand.trim().split(/\s+/);
  const lowerUserWords = userWords.map((word) => word.toLowerCase());

  for (const command of commands) {
    for (const phrase of getCommandPhrases(command)) {
      const phraseWords = phrase.toLowerCase().split(" ");
      if (!phraseWords.every((word, index) => lowerUserWords[index] === word)) continue;

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

// case-insensitive like separateCommand: "He" completes to "help"
export const getAutocompleteCommands = (commands: string[], userCommand: string) => {
  const prefix = userCommand.toLowerCase();
  return commands.filter((x) => x.toLowerCase().startsWith(prefix));
};

// "/settings" and "/settings/" -> "/"; the root is its own parent
export const getParentPath = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  return `/${segments.slice(0, -1).join("/")}`;
};
