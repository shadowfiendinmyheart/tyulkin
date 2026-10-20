import { CommandDescriptionKeys } from "../localization/interfaces";
import { ALL_PATHS, formatPath } from "./fileSystem";
import { Command } from "./interfaces";

// the command palette (TASK-90): what can be run with a click, found by a fuzzy search

export interface PaletteEntry {
  // run as typed, so it gets into the history
  command: string;
  descriptionKey: CommandDescriptionKeys;
}

// their params are paths relative to the page (`../about.md`): the palette lists every file and
// directory from the home instead, the same on every page
const FILE_SYSTEM_COMMANDS = ["ls", "cd", "cat", "tree"];

// every command of the page by its name (aliases are other spellings of the same), with each of
// its params; a file opens with `cat ~/…`, a directory with `cd ~/…`
export const getPaletteEntries = (commands: Command[]): PaletteEntry[] => {
  const entries = commands.flatMap(({ name, params, bareCompletion, descriptionKey }) => {
    const isFileSystem = FILE_SYSTEM_COMMANDS.includes(name);
    // `cat` alone only tells how to use it
    const bare = !isFileSystem || bareCompletion ? [name] : [];
    const withParams = isFileSystem ? [] : (params ?? []).map((param) => `${name} ${param}`);
    return [...bare, ...withParams].map((command) => ({ command, descriptionKey }));
  });

  const byName = (name: string) => commands.find((command) => command.name === name);
  const cat = byName("cat");
  const cd = byName("cd");
  const paths = ALL_PATHS.slice(1).flatMap((path): PaletteEntry[] => {
    const opener = path[path.length - 1].kind === "file" ? cat : cd;
    return opener
      ? [{ command: `${opener.name} ${formatPath(path)}`, descriptionKey: opener.descriptionKey }]
      : [];
  });

  // a command with several pages (`help`) is listed once: the page one goes first
  const seen = new Set<string>();
  return [...entries, ...paths].filter(({ command }) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
};

export interface PaletteMatch<T> {
  entry: T;
  // the matched chars of the command, to highlight them; empty: found by its description only
  indices: number[];
}

// a char that starts a word of a command or a path: "set theme", "~/projects/README.md"
const isWordStart = (text: string, index: number) =>
  index === 0 || /[\s/~.-]/.test(text[index - 1]);

// the query chars in the text in order, not necessarily in a row ("stb" — "set theme Black");
// wordStarts: a char is taken at the next word start if there is one, else at its next occurrence.
// A higher score for chars in a row and at word starts
const matchChars = (query: string, text: string, wordStarts: boolean) => {
  const lowerText = text.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let from = 0;
  for (const char of query) {
    let index = lowerText.indexOf(char, from);
    if (index === -1) return;
    const previous = indices[indices.length - 1];
    if (wordStarts && index !== previous + 1) {
      for (let next = index; next !== -1; next = lowerText.indexOf(char, next + 1)) {
        if (isWordStart(text, next)) {
          index = next;
          break;
        }
      }
    }
    if (index === previous + 1) score += 3;
    if (isWordStart(text, index)) score += 2;
    indices.push(index);
    from = index + 1;
  }
  // the shorter of equally matching commands is the closer one
  return { score: score - text.length / 100, indices };
};

// a jump to a word start may skip the only occurrence a later char needs ("ba" in "xb a b"):
// then the chars are taken at their next occurrences, which finds any match there is
const fuzzyMatch = (query: string, text: string) =>
  matchChars(query, text, true) ?? matchChars(query, text, false);

// the entries for a query, the best first: commands with every typed word in them ("set th",
// "cont"), then the entries with every word in their descriptions (a visitor who doesn't know
// the commands types what they want: "theme", "почта"), then the commands with the chars
// scattered ("stw"). Spaces between the chars don't matter, case neither.
// An empty query keeps every entry in order
export const searchPalette = <T extends { command: string; description: string }>(
  entries: T[],
  query: string,
): PaletteMatch<T>[] => {
  const chars = query.toLowerCase().replace(/\s+/g, "");
  if (!chars) return entries.map((entry) => ({ entry, indices: [] }));

  const words = query.toLowerCase().trim().split(/\s+/);
  const hasWords = (text: string) => words.every((word) => text.toLowerCase().includes(word));
  const found: { match: PaletteMatch<T>; tier: number; score: number }[] = [];
  for (const entry of entries) {
    const matched = fuzzyMatch(chars, entry.command);
    const tier =
      matched && hasWords(entry.command) ? 0 : hasWords(entry.description) ? 1 : matched ? 2 : -1;
    if (tier === -1) continue;
    found.push({
      match: { entry, indices: matched?.indices ?? [] },
      tier,
      score: matched?.score ?? 0,
    });
  }
  // a stable sort: equal ones stay in the order of the page
  found.sort((a, b) => a.tier - b.tier || b.score - a.score);
  return found.map(({ match }) => match);
};
