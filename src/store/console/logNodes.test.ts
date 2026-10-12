import { describe, expect, it } from "vitest";
import { getNodesLength, joinNodes, linkify, sliceNodes, withNode, withNodes } from "./logNodes";
import { LogNode } from "./interfaces";

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

describe("sliceNodes (TASK-53)", () => {
  const link = { type: "link", text: "site", href: "https://example.com" } as const;
  const help = { type: "command", command: "help" } as const;
  const table: LogNode = { type: "table", rows: [[["ab"], ["cd"]], [["ef"]]] };

  it("counts visible characters", () => {
    expect(getNodesLength(["ab", link, help])).toBe(10);
    expect(getNodesLength([table])).toBe(6);
  });

  it("cuts nodes to the visible length, keeping their kind", () => {
    expect(sliceNodes(["ab", link], 4)).toEqual(["ab", { ...link, text: "si" }]);
    expect(sliceNodes(["ab", link], 2)).toEqual(["ab"]);
    expect(sliceNodes(["ab", link], 0)).toEqual([]);
    expect(sliceNodes(["ab", link], 100)).toEqual(["ab", link]);
  });

  it("keeps a half-typed command as plain text", () => {
    expect(sliceNodes([help], 2)).toEqual(["he"]);
    expect(sliceNodes([help], 4)).toEqual([help]);
  });

  it("types a table cell by cell", () => {
    expect(sliceNodes([table], 3)).toEqual([{ type: "table", rows: [[["ab"], ["c"]]] }]);
    expect(sliceNodes([table], 5)).toEqual([{ type: "table", rows: [[["ab"], ["cd"]], [["e"]]] }]);
  });

  it("shows decorative art at once (TASK-54)", () => {
    const art: LogNode = { type: "pre", text: "|_|", decorative: true };
    const neofetch: LogNode = { type: "table", rows: [[[art], ["abc"]]] };
    expect(getNodesLength([neofetch])).toBe(3);
    expect(sliceNodes([neofetch], 1)).toEqual([{ type: "table", rows: [[[art], ["a"]]] }]);
  });
});
