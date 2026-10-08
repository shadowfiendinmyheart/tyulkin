// start: offset in the message, a stable key for the part
export type LogPart = { text: string; start: number; href?: string };

// a URL runs up to the next whitespace, so in dictionaries it must not be followed by punctuation;
// a phone is an international number: "+" and digits, spaces and dashes
const LINK_REGEXP = /https?:\/\/\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+\d[\d -]{6,}\d/g;

const getHref = (link: string) => {
  if (link.includes("://")) return link;
  if (link.includes("@")) return `mailto:${link}`;
  return `tel:${link.replace(/[ -]/g, "")}`;
};

// splits a log message into plain text and links (URLs, emails and phones)
export const splitLinks = (message: string): LogPart[] => {
  const parts: LogPart[] = [];
  let textStart = 0;

  for (const { 0: link, index } of message.matchAll(LINK_REGEXP)) {
    if (index > textStart) parts.push({ text: message.slice(textStart, index), start: textStart });
    parts.push({ text: link, start: index, href: getHref(link) });
    textStart = index + link.length;
  }

  if (textStart < message.length) parts.push({ text: message.slice(textStart), start: textStart });
  return parts;
};
