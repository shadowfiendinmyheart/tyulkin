import { COMMAND_PARAM } from "../router/const";
import { LogNode } from "../store/console/interfaces";
import { joinNodes } from "../store/console/logNodes";
import { normalizeInput } from "../utils";
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

// a help table row: "menu (exit)" | "return to the main menu"
export const getHelpRow = (command: Command, description: string): LogNode[][] => {
  const name: LogNode[] = [{ type: "command", command: command.name }];
  if (command.aliases?.length) {
    const aliases = command.aliases.map((alias): LogNode => ({ type: "command", command: alias }));
    name.push(" (", ...joinNodes(aliases, ", "), ")");
  }
  return [name, [description]];
};

// optimal string alignment distance: Levenshtein where swapping two neighbours is one edit,
// so "abuot" is one typo away from "about"
const getEditDistance = (a: string, b: string, maxDistance: number) => {
  // a cheap bound: a long pasted line is not compared letter by letter
  if (Math.abs(a.length - b.length) > maxDistance) return Infinity;
  const distances = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        distances[i][j] = Math.min(distances[i][j], distances[i - 2][j - 2] + 1);
      }
    }
  }
  return distances[a.length][b.length];
};

// the closest command for an unknown one ("abuot" -> "about"), among names and aliases,
// bare and with each param; short inputs allow one typo, longer ones two;
// on a tie the first command wins, so page commands win over global ones
export const getSuggestion = (commands: Command[], userCommand: string) => {
  const input = normalizeInput(userCommand);
  const maxDistance = input.length <= 4 ? 1 : 2;
  const phrases = commands.flatMap((command) =>
    getCommandPhrases(command).flatMap((phrase) => [
      phrase,
      ...(command.params ?? []).map((param) => `${phrase} ${param}`),
    ]),
  );

  let suggestion: string | undefined;
  let suggestionDistance = maxDistance + 1;
  for (const phrase of phrases) {
    const distance = getEditDistance(input, phrase.toLowerCase(), maxDistance);
    if (distance < suggestionDistance) {
      suggestion = phrase;
      suggestionDistance = distance;
    }
  }
  return suggestion;
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

// the latest command of the history that a deep link on this page can run: a command of the
// page (history is shared between pages) that is not marked unshareable, as it was typed
export const getShareableCommand = (commands: Command[], history: string[]) =>
  history.find((entry) => {
    const separated = separateCommand(commands, entry);
    return separated && separated.command.shareable !== false;
  });

// the current address with the command as the only parameter: "https://…/tyulkin/?cmd=about"
export const getCommandLink = (href: string, command: string) => {
  const url = new URL(href);
  url.search = new URLSearchParams({ [COMMAND_PARAM]: command }).toString();
  url.hash = "";
  return url.toString();
};
