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
