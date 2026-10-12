import { LogNode } from "./interfaces";

// a URL runs up to the next whitespace, so in dictionaries it must not be followed by punctuation;
// a phone is an international number: "+" and digits, spaces and dashes
const LINK_REGEXP = /https?:\/\/\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+\d[\d -]{6,}\d/g;

const getHref = (link: string) => {
  if (link.includes("://")) return link;
  if (link.includes("@")) return `mailto:${link}`;
  return `tel:${link.replace(/[ -]/g, "")}`;
};

// splits the owner's text into plain text and links (URLs, emails and phones)
export const linkify = (message: string): LogNode[] => {
  const nodes: LogNode[] = [];
  let textStart = 0;

  for (const { 0: link, index } of message.matchAll(LINK_REGEXP)) {
    if (index > textStart) nodes.push(message.slice(textStart, index));
    nodes.push({ type: "link", text: link, href: getHref(link) });
    textStart = index + link.length;
  }

  if (textStart < message.length) nodes.push(message.slice(textStart));
  return nodes;
};

// "about   help   ls": nodes with a separator between them
export const joinNodes = (nodes: LogNode[], separator: string): LogNode[] =>
  nodes.flatMap((node, index) => (index ? [separator, node] : [node]));

// a node is replaced by a placeholder value, so the text around it stays in the dictionary;
// "\u0000<index>\u0000" doesn't occur in dictionary texts
const getPlaceholder = (index: number) => `\u0000${index}\u0000`;
// eslint-disable-next-line no-control-regex -- the placeholder is made of control chars on purpose
const PLACEHOLDER_REGEXP = /\u0000(\d+)\u0000/;

// puts nodes in place of their placeholders:
// withNodes(([help, ls]) => t({ …, args: { help, ls } }), [helpNode, lsNode])
export const withNodes = (
  getText: (placeholders: string[]) => string,
  nodes: LogNode[],
): LogNode[] =>
  getText(nodes.map((_, index) => getPlaceholder(index)))
    // with a capturing group split puts the indexes at odd positions
    .split(PLACEHOLDER_REGEXP)
    // an index without a node came from an arg (echoed input), not a placeholder: kept as text
    .map((part, position) => (position % 2 ? (nodes[Number(part)] ?? `\u0000${part}\u0000`) : part))
    .filter((part) => part !== "");

// withNode((value) => t({ …, args: { command: value } }), node)
export const withNode = (getText: (placeholder: string) => string, node: LogNode): LogNode[] =>
  withNodes(([placeholder]) => getText(placeholder), [node]);

// visible characters of a node: what typing out goes through; decorative nodes (ASCII art)
// are not typed out but shown at once, and may be hidden on a phone, so they count for nothing
const getNodeLength = (node: LogNode): number => {
  if (typeof node === "string") return node.length;
  if ("decorative" in node && node.decorative) return 0;
  switch (node.type) {
    case "command":
      return node.command.length;
    case "table":
      return node.rows.flat().reduce((sum, cell) => sum + getNodesLength(cell), 0);
    default:
      return node.text.length;
  }
};

export const getNodesLength = (nodes: LogNode[]): number =>
  nodes.reduce((sum, node) => sum + getNodeLength(node), 0);

// the node cut to its first `length` visible characters (0 < length < its length)
const sliceNode = (node: LogNode, length: number): LogNode => {
  if (typeof node === "string") return node.slice(0, length);
  switch (node.type) {
    // plain text until typed out in full: a click must not run a half-typed command
    case "command":
      return node.command.slice(0, length);
    case "table": {
      const rows: LogNode[][][] = [];
      let left = length;
      for (const row of node.rows) {
        if (left <= 0) break;
        const cells: LogNode[][] = [];
        for (const cell of row) {
          if (left <= 0) break;
          cells.push(sliceNodes(cell, left));
          left -= getNodesLength(cell);
        }
        rows.push(cells);
      }
      return { ...node, rows };
    }
    default:
      return { ...node, text: node.text.slice(0, length) };
  }
};

// the first `length` visible characters of nodes: a log being typed out
export const sliceNodes = (nodes: LogNode[], length: number): LogNode[] => {
  const sliced: LogNode[] = [];
  let left = length;
  for (const node of nodes) {
    if (left <= 0) break;
    const nodeLength = getNodeLength(node);
    sliced.push(nodeLength <= left ? node : sliceNode(node, left));
    left -= nodeLength;
  }
  return sliced;
};
