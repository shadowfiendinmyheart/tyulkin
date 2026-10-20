import { Languages } from "../localization/interfaces";
import { htmlLangByLanguage } from "../localization/utils";
import { LogNode } from "../store/console/interfaces";

// shell habits (TASK-61): `whoami`, `pwd`, `!!`, `| grep`, history search

// who the visitor is in the terminal (`whoami`), on which machine and where their home is (`pwd`)
export const USER_NAME = "visitor";
export const HOST_NAME = "tyulkin";
export const HOME_DIRECTORY = `/home/${USER_NAME}`;

// the directory of a terminal page: every directory of the virtual file system (TASK-60) is a
// page, the main page is the home, "/settings" is "~/settings"
const getHomeSubpath = (pathname: string) => pathname.replace(/\/+$/, "");
export const getWorkingDirectory = (pathname: string) =>
  `${HOME_DIRECTORY}${getHomeSubpath(pathname)}`;

// the segments of the prompt (TASK-81), the command line draws each in its own color
export const getPromptSegments = (pathname: string) => ({
  user: `${USER_NAME}@${HOST_NAME}`,
  directory: `~${getHomeSubpath(pathname)}`,
  symbol: "❯",
});

// the prompt of the command line and of the echoed input: "visitor@tyulkin ~/settings ❯"
export const getPrompt = (pathname: string) => {
  const { user, directory, symbol } = getPromptSegments(pathname);
  return `${user} ${directory} ${symbol}`;
};

// "Tuesday, October 13, 2026 at 2:03:12 PM GMT+3" in the language of the terminal
export const formatDate = (now: Date, language: Languages) =>
  new Intl.DateTimeFormat(htmlLangByLanguage[language], {
    dateStyle: "full",
    timeStyle: "long",
  }).format(now);

// quoted parts lose their quotes, as in a shell: echo "a" 'it"s' -> a it"s
export const unquote = (text: string) => text.replace(/(["'])([\s\S]*?)\1/g, "$2");

// [start, end) of each part of the line split by "|" outside quotes: echo "a|b" is one command;
// positions are UTF-16 units (a surrogate is never a quote or a "|"), as the line highlighting
// (TASK-86) draws it
export const getPipeRanges = (line: string) => {
  const ranges: [number, number][] = [];
  let start = 0;
  let quote: string | undefined;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "|") {
      ranges.push([start, index]);
      start = index + 1;
    }
  }
  ranges.push([start, line.length]);
  return ranges;
};

const splitPipes = (line: string) =>
  getPipeRanges(line).map(([start, end]) => line.slice(start, end));

// `!!` is the previous command, wherever it is in the line ("sudo !!");
// undefined when there is no previous command
export const HISTORY_EXPANSION = "!!";
export const expandHistory = (line: string, previous: string | undefined) => {
  if (!line.includes(HISTORY_EXPANSION)) return line;
  // split/join, not replaceAll: "$&" in the command must stay as is
  return previous === undefined ? undefined : line.split(HISTORY_EXPANSION).join(previous);
};

// `history`: oldest first, numbered as in bash
export const formatHistory = (history: string[]) =>
  [...history]
    .reverse()
    .map((command, index) => `${String(index + 1).padStart(5)}  ${command}`)
    .join("\n");

// the index of the newest history entry from `from` on that contains the query (Ctrl+R),
// -1 if there is none or the query is empty; case-insensitive like the commands
export const findHistoryMatch = (history: string[], query: string, from = 0) => {
  if (!query) return -1;
  const lowerQuery = query.toLowerCase();
  for (let index = Math.max(0, from); index < history.length; index++) {
    if (history[index].toLowerCase().includes(lowerQuery)) return index;
  }
  return -1;
};

export interface GrepFilter {
  pattern: string;
  ignoreCase: boolean;
}

// a stage after a "|" (trimmed): "grep -i 'set the'"; undefined when it is not grep with a pattern
export const parseGrepStage = (stage: string): GrepFilter | undefined => {
  const match = /^grep(?:\s+(-i))?\s+(\S[\s\S]*)$/i.exec(stage);
  const pattern = match && unquote(match[2]);
  if (!pattern) return;
  return { pattern, ignoreCase: Boolean(match[1]) };
};

// "help | grep theme | grep -i set": the command and its filters;
// undefined when something other than grep follows a "|"
export const parsePipeline = (line: string) => {
  const [command, ...stages] = splitPipes(line).map((part) => part.trim());
  const filters: GrepFilter[] = [];
  for (const stage of stages) {
    const filter = parseGrepStage(stage);
    if (!filter) return;
    filters.push(filter);
  }
  if (!command && filters.length) return;
  return { command, filters };
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getNodeText = (node: LogNode): string => {
  if (typeof node === "string") return node;
  switch (node.type) {
    case "command":
      return node.label ?? node.command;
    case "table":
      return node.rows.map((row) => row.map(getNodesText).join(" ")).join("\n");
    default:
      return node.text;
  }
};
const getNodesText = (nodes: LogNode[]) => nodes.map(getNodeText).join("");

// the matches of the pattern in strings and colored texts are highlighted
const highlight = (nodes: LogNode[], regexp: RegExp): LogNode[] =>
  nodes.flatMap((node): LogNode[] => {
    if (typeof node !== "string" && node.type !== "text") return [node];
    const text = typeof node === "string" ? node : node.text;
    // with a capturing group split puts the matches at odd positions
    return text
      .split(regexp)
      .map((part, position): LogNode => {
        if (position % 2) return { type: "text", text: part, color: "accent" };
        return typeof node === "string" ? part : { ...node, text: part };
      })
      .filter((part) => getNodeText(part) !== "");
  });

type BlockNode = Extract<LogNode, { type: "table" | "pre" }>;
const isBlock = (node: LogNode): node is BlockNode =>
  typeof node !== "string" && (node.type === "table" || node.type === "pre");

// a line of text, or a table or pre block, which hold lines of their own
type Chunk = { line: LogNode[] } | { block: BlockNode };

const splitLines = (nodes: LogNode[]): Chunk[] => {
  const chunks: Chunk[] = [];
  let line: LogNode[] = [];
  const endLine = () => {
    if (line.length) chunks.push({ line });
    line = [];
  };
  for (const node of nodes) {
    if (isBlock(node)) {
      endLine();
      chunks.push({ block: node });
    } else if (typeof node === "string" || node.type === "text") {
      const text = typeof node === "string" ? node : node.text;
      text.split("\n").forEach((part, index) => {
        if (index) endLine();
        if (part) line.push(typeof node === "string" ? part : { ...node, text: part });
      });
    } else {
      line.push(node);
    }
  }
  endLine();
  return chunks;
};

// the lines of a log that contain the pattern, as `grep` keeps them: in a table a row of
// one-line cells is a line (a row of help), other rows are searched cell by cell (neofetch)
const grepNodes = (nodes: LogNode[], regexp: RegExp): LogNode[] => {
  const matches = (text: string) => text.search(regexp) !== -1;
  const result: LogNode[] = [];
  let afterLine = false;
  for (const chunk of splitLines(nodes)) {
    if ("line" in chunk) {
      if (!matches(getNodesText(chunk.line))) continue;
      if (afterLine) result.push("\n");
      result.push(...highlight(chunk.line, regexp));
      afterLine = true;
      continue;
    }
    const { block } = chunk;
    if (block.type === "pre") {
      const lines = block.text.split("\n").filter(matches);
      // some rows of a QR code are no code: plain text then
      if (lines.length) result.push({ ...block, text: lines.join("\n"), qr: undefined });
    } else {
      const rows = block.rows.flatMap((row) => {
        const isLine = row.every(
          (cell) => !cell.some(isBlock) && !getNodesText(cell).includes("\n"),
        );
        if (isLine) {
          return row.some((cell) => matches(getNodesText(cell)))
            ? [row.map((cell) => highlight(cell, regexp))]
            : [];
        }
        const cells = row.map((cell) => grepNodes(cell, regexp));
        return cells.some((cell) => cell.length) ? [cells] : [];
      });
      if (rows.length) result.push({ ...block, rows });
    }
    afterLine = false;
  }
  return result;
};

export const grep = (nodes: LogNode[], { pattern, ignoreCase }: GrepFilter) =>
  grepNodes(nodes, new RegExp(`(${escapeRegExp(pattern)})`, ignoreCase ? "gi" : "g"));
