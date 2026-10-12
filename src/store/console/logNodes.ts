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

// replaced by a placeholder value, so the text around it stays in the dictionary
const PLACEHOLDER = "\u0000";

// puts a node in place of the placeholder: withNode((value) => t({ …, args: { command: value } }), node)
export const withNode = (getText: (placeholder: string) => string, node: LogNode): LogNode[] => {
  const [before, ...after] = getText(PLACEHOLDER).split(PLACEHOLDER);
  return [before, node, after.join("")].filter((part) => part !== "");
};
