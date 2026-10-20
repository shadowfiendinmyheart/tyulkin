import { CommandBase } from "./interfaces";
import { getPipeRanges, HISTORY_EXPANSION, parseGrepStage } from "./shell";
import { separateCommand } from "./utils";

// fish-like highlighting of the command line (TASK-86): what each char of the line is
// - command: the words of a command that runs ("set theme"), or a valid grep after a "|"
// - unknown: the first word of a part that doesn't run as typed
// - argument: the other words
// - path: an argument of the command that is an existing file or directory
// - text: spaces, "|"
export type HighlightKind = "command" | "unknown" | "argument" | "path" | "text";

export interface HighlightOptions {
  // the command lists in the order the line is matched against them, as the handler does:
  // the commands of the page, then easter eggs
  commandLists: CommandBase[][];
  // `!!` is the previous command: without history it fails
  hasHistory: boolean;
  // an argument as typed is an existing path
  isPath: (typed: string) => boolean;
}

interface Word {
  text: string;
  start: number;
}

// the words of a part of the line, with their positions in the line
const getWords = (line: string, start: number, end: number): Word[] =>
  Array.from(line.slice(start, end).matchAll(/\S+/g), (match) => ({
    text: match[0],
    start: start + match.index,
  }));

// how many first words of the command part are the command, as the handler resolves it;
// 0: it doesn't run (no such command, or too many arguments for it)
const getCommandLength = (
  { commandLists, hasHistory }: HighlightOptions,
  part: string,
  words: Word[],
) => {
  if (words[0].text === HISTORY_EXPANSION) return hasHistory ? 1 : 0;
  for (const commands of commandLists) {
    const separated = separateCommand(commands, part);
    if (separated) return words.length - separated.params.length;
  }
  return 0;
};

// the kind of each char of the line; the command is the first part of a pipeline, the next
// parts are grep filters
export const highlightLine = (options: HighlightOptions, line: string): HighlightKind[] => {
  // indexed by UTF-16 units, as the line is drawn by line.split("")
  const kinds = Array<HighlightKind>(line.length).fill("text");
  const paint = ({ text, start }: Word, kind: HighlightKind) =>
    kinds.fill(kind, start, start + text.length);

  getPipeRanges(line).forEach(([start, end], partIndex) => {
    const words = getWords(line, start, end);
    if (!words.length) return;
    const part = line.slice(start, end).trim();
    const isCommandPart = partIndex === 0;
    let commandLength: number;
    if (isCommandPart) commandLength = getCommandLength(options, part, words);
    else commandLength = parseGrepStage(part) ? 1 : 0;

    words.forEach((word, index) => {
      if (index < commandLength) paint(word, "command");
      else if (index === 0) paint(word, "unknown");
      // a grep pattern is a text to find, not a path
      else paint(word, isCommandPart && options.isPath(word.text) ? "path" : "argument");
    });
  });
  return kinds;
};
