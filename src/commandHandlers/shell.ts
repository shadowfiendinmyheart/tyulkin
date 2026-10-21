import { Languages } from "../localization/interfaces";
import { htmlLangByLanguage } from "../localization/utils";
import { LogNode, RainbowPosition } from "../store/console/interfaces";
import { getNodesText, getNodeText } from "../store/console/logNodes";
import { getRainbowRuns } from "../store/console/rainbow";

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

// what can follow a "|": grep (TASK-61) or lolcat (TASK-99)
export type PipeStage = ({ type: "grep" } & GrepFilter) | { type: "lolcat" };

// a stage after a "|" (trimmed); undefined when it is neither grep with a pattern nor lolcat
export const parsePipeStage = (stage: string): PipeStage | undefined => {
  if (/^lolcat$/i.test(stage)) return { type: "lolcat" };
  const filter = parseGrepStage(stage);
  return filter && { type: "grep", ...filter };
};

// "help | grep theme | lolcat": the command and the stages its output goes through;
// undefined when something else follows a "|"
export const parsePipeline = (line: string) => {
  const [command, ...parts] = splitPipes(line).map((part) => part.trim());
  const stages: PipeStage[] = [];
  for (const part of parts) {
    const stage = parsePipeStage(part);
    if (!stage) return;
    stages.push(stage);
  }
  if (!command && stages.length) return;
  return { command, stages };
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      const text = lines.join("\n");
      // some rows of a QR code are no code: plain text then; some rows of `figlet` art don't
      // read as its label any more
      if (lines.length) {
        const label = text === block.text ? block.label : undefined;
        result.push({ ...block, text, qr: undefined, label });
      }
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

// the lines of a cell: how many rows of the output it takes, and the widest one
const measureCell = (cell: LogNode[]) => {
  const lines = getNodesText(cell).split("\n");
  return { height: lines.length, width: Math.max(...lines.map((line) => Array.from(line).length)) };
};

// the nodes in rainbow colors from `start` on, and where the next node goes on; a line of them
// starts at the column `left` (a cell of a table). Commands and links keep their look (they are
// clicked), so do decorative nodes (their look is what they show: the palette and the logo of neofetch), a QR
// code stays black on white (it is scanned). Columns of a table are counted from the widest line
// of a cell and a gap: close to what is drawn, not exact
const colorNodes = (nodes: LogNode[], start: RainbowPosition, left: number) => {
  let position = start;
  const colored = nodes.flatMap((node): LogNode[] => {
    if (typeof node === "string" || node.type === "text") {
      const text = typeof node === "string" ? node : node.text;
      const { runs, end } = getRainbowRuns(text, position, left);
      position = end;
      if (typeof node !== "string" && node.decorative) return [node];
      return runs.map(({ text: run, color }): LogNode => ({ type: "text", text: run, color }));
    }
    if (node.type === "command" || node.type === "link") {
      position = { ...position, col: position.col + Array.from(getNodeText(node)).length };
      return [node];
    }
    // a block starts on a line of its own and ends one
    let row = position.row + (position.col > left ? 1 : 0);
    if (node.type === "pre") {
      position = { row: row + node.text.split("\n").length, col: left };
      return [node.qr || node.decorative ? node : { ...node, rainbow: { row, col: left } }];
    }
    const rows = node.rows.map((cells) => {
      const sizes = cells.map(measureCell);
      let col = left;
      const coloredCells = cells.map((cell, index) => {
        const coloredCell = colorNodes(cell, { row, col }, col).nodes;
        col += sizes[index].width + 1;
        return coloredCell;
      });
      row += Math.max(1, ...sizes.map(({ height }) => height));
      return coloredCells;
    });
    position = { row, col: left };
    return [{ ...node, rows }];
  });
  return { nodes: colored, end: position };
};

// `| lolcat` (TASK-99): the output in the colors of the rainbow, in diagonal stripes, from `start`
// on; `end` is where the next output goes on
export const lolcat = (nodes: LogNode[], start: RainbowPosition = { row: 0, col: 0 }) =>
  colorNodes(nodes, start, 0);

// what the output of a command goes through after a "|": lolcat colors what grep has kept,
// wherever it stands (`| lolcat | grep x` as `| grep x | lolcat`), as grep finds a word in a text
// of one piece. The rainbow goes on from one log of the command to the next, a log is a line
export const createPipe = (stages: PipeStage[]) => {
  const isColored = stages.some(({ type }) => type === "lolcat");
  let position: RainbowPosition = { row: 0, col: 0 };
  return (nodes: LogNode[]) => {
    const filtered = stages.reduce(
      (result, stage) => (stage.type === "grep" ? grep(result, stage) : result),
      nodes,
    );
    if (!isColored || !filtered.length) return filtered;
    const { nodes: colored, end } = lolcat(filtered, position);
    position = { row: end.row + (end.col ? 1 : 0), col: 0 };
    return colored;
  };
};
