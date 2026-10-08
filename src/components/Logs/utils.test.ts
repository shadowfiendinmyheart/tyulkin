import { describe, expect, it } from "vitest";
import { splitLinks } from "./utils";

describe("splitLinks", () => {
  it("keeps a message without links as one part", () => {
    expect(splitLinks("Hi everyone!")).toEqual([{ text: "Hi everyone!", start: 0 }]);
  });

  it("turns URLs and emails into links", () => {
    expect(splitLinks("GitHub: https://github.com/user\nEmail: me@example.ru")).toEqual([
      { text: "GitHub: ", start: 0 },
      { text: "https://github.com/user", start: 8, href: "https://github.com/user" },
      { text: "\nEmail: ", start: 31 },
      { text: "me@example.ru", start: 39, href: "mailto:me@example.ru" },
    ]);
  });

  it("turns phones into tel links", () => {
    expect(splitLinks("Phone: +7 950 821-18-19")).toEqual([
      { text: "Phone: ", start: 0 },
      { text: "+7 950 821-18-19", start: 7, href: "tel:+79508211819" },
    ]);
  });

  it("ends a URL at whitespace and keeps non-latin paths", () => {
    expect(splitLinks("https://example.com/иван end")).toEqual([
      { text: "https://example.com/иван", start: 0, href: "https://example.com/иван" },
      { text: " end", start: 24 },
    ]);
  });
});
