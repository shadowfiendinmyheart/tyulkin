import { describe, expect, it } from "vitest";
import { commandsByRoute, globalCommands } from "./commands";
import { getPaletteEntries, searchPalette } from "./palette";
import { ROUTES } from "../router/const";

const commandsOf = (route: keyof typeof commandsByRoute) =>
  getPaletteEntries([...commandsByRoute[route], ...globalCommands]).map(({ command }) => command);

const entries = (...commands: [string, string][]) =>
  commands.map(([command, description]) => ({ command, description }));

const search = (list: ReturnType<typeof entries>, query: string) =>
  searchPalette(list, query).map(({ entry }) => entry.command);

describe("palette entries (TASK-90)", () => {
  it("lists the commands with their params, page ones first, each once", () => {
    const commands = commandsOf(ROUTES.SETTINGS);
    expect(commands.slice(0, 2)).toEqual(["set theme", "set theme White"]);
    expect(commands).toContain("set language ru");
    expect(commands).toContain("help");
    expect(new Set(commands).size).toBe(commands.length);
  });

  it("lists the files and directories from the home on every page, not relative paths", () => {
    for (const route of [ROUTES.MAIN, ROUTES.SETTINGS]) {
      const commands = commandsOf(route);
      expect(commands).toEqual(
        expect.arrayContaining(["cat ~/about.md", "cat ~/projects/README.md", "cd ~/projects"]),
      );
      expect(commands).toEqual(expect.arrayContaining(["ls", "cd", "tree"]));
      // `cat` alone only tells how to use it
      expect(commands).not.toContain("cat");
      expect(commands.filter((command) => command.includes("../"))).toEqual([]);
    }
  });
});

describe("palette search (TASK-90)", () => {
  const list = entries(
    ["help", "list the commands"],
    ["set theme Black", "change the color theme"],
    ["set theme White", "change the color theme"],
    ["show themes", "list the themes"],
    ["cat ~/contacts.md", "print a file"],
  );

  it("keeps every entry in order for an empty query", () => {
    expect(search(list, "  ")).toEqual(list.map(({ command }) => command));
  });

  it("matches chars in order, not in a row, case and spaces aside", () => {
    expect(search(list, "stw")).toEqual(["set theme White"]);
    expect(search(list, "Set Th W")).toEqual(["set theme White"]);
    expect(search(list, "xyz")).toEqual([]);
  });

  it("ranks chars in a row and at word starts higher", () => {
    expect(search(list, "them")[0]).toBe("show themes");
    expect(search(list, "cont")).toEqual(["cat ~/contacts.md"]);
  });

  it("finds by the description after the commands", () => {
    expect(search(list, "color")).toEqual(["set theme Black", "set theme White"]);
    expect(search(list, "list")).toEqual(["help", "show themes"]);
  });

  it("returns the matched chars of the command", () => {
    expect(searchPalette(list, "hlp")[0].indices).toEqual([0, 2, 3]);
    expect(searchPalette(list, "file")[0].indices).toEqual([]);
  });
});

describe("palette search ranking (TASK-90)", () => {
  it("falls back to plain occurrences when a jump to a word start leaves no match", () => {
    const list = entries(["xb a b", ""]);
    expect(searchPalette(list, "ba")[0].indices).toEqual([1, 3]);
  });

  it("puts description matches between whole-word and scattered command matches", () => {
    const list = entries(
      ["make it loud", "build"],
      ["contacts", "how to mail me"],
      ["mail", "write"],
    );
    expect(search(list, "mail")).toEqual(["mail", "contacts", "make it loud"]);
  });
});
