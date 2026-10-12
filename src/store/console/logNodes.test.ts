import { describe, expect, it } from "vitest";
import { joinNodes, linkify, withNode, withNodes } from "./logNodes";

describe("joinNodes", () => {
  it("puts the separator between nodes only", () => {
    const ls = { type: "command", command: "ls" } as const;
    expect(joinNodes([ls, "b"], ", ")).toEqual([ls, ", ", "b"]);
    expect(joinNodes([ls], ", ")).toEqual([ls]);
    expect(joinNodes([], ", ")).toEqual([]);
  });
});

describe("withNode", () => {
  const help = { type: "command", command: "help" } as const;

  it("puts the node in place of the placeholder, keeping the text around it", () => {
    expect(withNode((value) => `Did you mean ${value}?`, help)).toEqual([
      "Did you mean ",
      help,
      "?",
    ]);
  });

  it("drops empty text around the node", () => {
    expect(withNode((value) => value, help)).toEqual([help]);
  });
});

describe("withNodes", () => {
  const help = { type: "command", command: "help" } as const;
  const ls = { type: "command", command: "ls" } as const;

  it("puts each node in place of its placeholder, in any order", () => {
    expect(withNodes(([a, b]) => `${b} or ${a}${a}!`, [help, ls])).toEqual([
      ls,
      " or ",
      help,
      help,
      "!",
    ]);
  });

  it("keeps a placeholder-like arg without a node as text", () => {
    expect(withNodes(([a]) => `${a} \u00007\u0000`, [help])).toEqual([help, " ", "\u00007\u0000"]);
  });

  it("keeps text without placeholders", () => {
    expect(withNodes(() => "no nodes", [help])).toEqual(["no nodes"]);
  });
});

describe("linkify", () => {
  it("keeps a message without links as one text node", () => {
    expect(linkify("Hi everyone!")).toEqual(["Hi everyone!"]);
  });

  it("turns URLs and emails into links", () => {
    expect(linkify("GitHub: https://github.com/user\nEmail: me@example.ru")).toEqual([
      "GitHub: ",
      { type: "link", text: "https://github.com/user", href: "https://github.com/user" },
      "\nEmail: ",
      { type: "link", text: "me@example.ru", href: "mailto:me@example.ru" },
    ]);
  });

  it("turns phones into tel links", () => {
    expect(linkify("Phone: +7 950 821-18-19")).toEqual([
      "Phone: ",
      { type: "link", text: "+7 950 821-18-19", href: "tel:+79508211819" },
    ]);
  });

  it("ends a URL at whitespace and keeps non-latin paths", () => {
    expect(linkify("https://example.com/иван end")).toEqual([
      { type: "link", text: "https://example.com/иван", href: "https://example.com/иван" },
      " end",
    ]);
  });
});
