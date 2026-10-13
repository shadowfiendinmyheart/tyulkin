import { describe, expect, it } from "vitest";
import { Command } from "./interfaces";
import {
  getAllCommandsWithParams,
  getAutocompleteCommands,
  getCommandLink,
  getHelpRow,
  getParentPath,
  getShareableCommand,
  getSuggestion,
  separateCommand,
} from "./utils";

const run = () => undefined;
const setTheme: Command = {
  name: "set theme",
  params: ["Black", "White"],
  descriptionKey: "helpSetTheme",
  run,
};
const showThemes: Command = { name: "show themes", descriptionKey: "helpShowThemes", run };
const back: Command = { name: "back", aliases: ["cd ..", "cd.."], descriptionKey: "helpBack", run };
const commands = [setTheme, showThemes, back];

describe("separateCommand", () => {
  it("splits a command and its param", () => {
    expect(separateCommand(commands, "set theme Black")).toEqual({
      command: setTheme,
      params: ["Black"],
    });
  });

  it("accepts a command with params but without an argument", () => {
    expect(separateCommand(commands, "set theme")).toEqual({ command: setTheme, params: [] });
  });

  it("ignores extra whitespace", () => {
    expect(separateCommand(commands, "  set   theme  Black ")).toEqual({
      command: setTheme,
      params: ["Black"],
    });
  });

  it("respects word boundaries", () => {
    expect(separateCommand(commands, "set themeblack")).toBeUndefined();
  });

  it("rejects extra arguments", () => {
    expect(separateCommand(commands, "show themes foo")).toBeUndefined();
    expect(separateCommand(commands, "set theme Black White")).toBeUndefined();
  });

  it("matches aliases", () => {
    expect(separateCommand(commands, "cd ..")).toEqual({ command: back, params: [] });
    expect(separateCommand(commands, "cd..")).toEqual({ command: back, params: [] });
    expect(separateCommand(commands, "cd")).toBeUndefined();
  });

  it("does not fall through to a later command on extra arguments", () => {
    const set: Command = { name: "set", params: ["x"], descriptionKey: "helpSetTheme", run };
    expect(separateCommand([setTheme, set], "set theme Black White")).toBeUndefined();
  });

  it("matches commands and aliases case-insensitively, keeping params as typed", () => {
    expect(separateCommand(commands, "Set THEME black")).toEqual({
      command: setTheme,
      params: ["black"],
    });
    expect(separateCommand(commands, "CD ..")).toEqual({ command: back, params: [] });
  });

  it("returns undefined for an unknown command", () => {
    expect(separateCommand(commands, "unknown")).toBeUndefined();
  });
});

describe("getAllCommandsWithParams", () => {
  it("expands every param and alias into a separate command", () => {
    expect(getAllCommandsWithParams(commands)).toEqual([
      "set theme Black",
      "set theme White",
      "show themes",
      "back",
      "cd ..",
      "cd..",
    ]);
  });

  it("keeps the command without an argument when it is completed bare (TASK-60)", () => {
    const ls: Command = { ...setTheme, name: "ls", params: ["projects"], bareCompletion: true };
    expect(getAllCommandsWithParams([ls])).toEqual(["ls", "ls projects"]);
  });
});

describe("getAutocompleteCommands", () => {
  const all = ["set theme Black", "set theme White", "show themes"];

  it("filters commands by prefix", () => {
    expect(getAutocompleteCommands(all, "set theme")).toEqual([
      "set theme Black",
      "set theme White",
    ]);
    expect(getAutocompleteCommands(all, "sh")).toEqual(["show themes"]);
  });

  it("ignores case", () => {
    expect(getAutocompleteCommands(all, "SET theme b")).toEqual(["set theme Black"]);
    expect(getAutocompleteCommands(all, "Sh")).toEqual(["show themes"]);
  });

  it("returns everything for an empty input and nothing for no match", () => {
    expect(getAutocompleteCommands(all, "")).toEqual(all);
    expect(getAutocompleteCommands(all, "x")).toEqual([]);
  });
});

describe("getHelpRow", () => {
  it("lists aliases next to the name as commands", () => {
    expect(getHelpRow(back, "go back")).toEqual([
      [
        { type: "command", command: "back" },
        " (",
        { type: "command", command: "cd .." },
        ", ",
        { type: "command", command: "cd.." },
        ")",
      ],
      ["go back"],
    ]);
    expect(getHelpRow(showThemes, "list themes")).toEqual([
      [{ type: "command", command: "show themes" }],
      ["list themes"],
    ]);
  });
});

describe("getSuggestion (TASK-57)", () => {
  const named = (name: string): Command => ({ name, descriptionKey: "helpAbout", run });
  const all = [named("about"), named("education"), named("help"), named("ls"), ...commands];

  it("suggests the closest command, counting a swap of neighbours as one typo", () => {
    expect(getSuggestion(all, "abuot")).toBe("about");
    expect(getSuggestion(all, "eductaion")).toBe("education");
    expect(getSuggestion(all, "lss")).toBe("ls");
  });

  it("compares names and aliases, bare and with params, ignoring case and extra whitespace", () => {
    expect(getSuggestion(all, "set  themeblack")).toBe("set theme Black");
    expect(getSuggestion(all, "set them")).toBe("set theme");
    expect(getSuggestion(all, "cd ,,")).toBe("cd ..");
    expect(getSuggestion(all, "ABOTU")).toBe("about");
  });

  it("allows one typo in short inputs and two in longer ones", () => {
    expect(getSuggestion(all, "hlp")).toBe("help");
    expect(getSuggestion(all, "hl")).toBeUndefined();
    expect(getSuggestion(all, "abxyt")).toBe("about");
    expect(getSuggestion(all, "axyzt")).toBeUndefined();
    expect(getSuggestion(all, "about".repeat(100))).toBeUndefined();
  });

  it("prefers the first command on a tie", () => {
    expect(getSuggestion([named("cat"), named("car")], "cax")).toBe("cat");
  });
});

describe("getParentPath", () => {
  it("drops the last segment, ignoring a trailing slash", () => {
    expect(getParentPath("/settings")).toBe("/");
    expect(getParentPath("/settings/")).toBe("/");
    expect(getParentPath("/a/b")).toBe("/a");
    expect(getParentPath("/a/b/")).toBe("/a");
  });

  it("keeps the root", () => {
    expect(getParentPath("/")).toBe("/");
  });
});

describe("getShareableCommand (TASK-62)", () => {
  const clear: Command = { name: "clear", descriptionKey: "helpClear", shareable: false, run };
  const share: Command = { name: "share", descriptionKey: "helpShare", shareable: false, run };
  const commands = [setTheme, showThemes, clear, share];

  it("takes the latest command of the page as it was typed", () => {
    expect(getShareableCommand(commands, ["Set Theme white", "show themes"])).toBe(
      "Set Theme white",
    );
  });

  it("skips unshareable commands and commands of other pages", () => {
    expect(getShareableCommand(commands, ["share", "clear", "about", "show themes"])).toBe(
      "show themes",
    );
    expect(getShareableCommand(commands, ["share", "about"])).toBeUndefined();
    expect(getShareableCommand(commands, [])).toBeUndefined();
  });

  it("takes a command with its grep filters (TASK-61)", () => {
    expect(getShareableCommand(commands, ["clear | grep x", "show themes | grep Bl"])).toBe(
      "show themes | grep Bl",
    );
    expect(getShareableCommand(commands, ["show themes | wc"])).toBeUndefined();
  });
});

describe("getCommandLink (TASK-62)", () => {
  it("keeps the address and puts the command into the only parameter", () => {
    expect(getCommandLink("https://a.github.io/tyulkin/settings?x=1#top", "set theme Hacker")).toBe(
      "https://a.github.io/tyulkin/settings?cmd=set+theme+Hacker",
    );
  });

  it("encodes the command", () => {
    const link = getCommandLink("https://a.github.io/", "a&cmd=b #c");
    expect(new URL(link).searchParams.getAll("cmd")).toEqual(["a&cmd=b #c"]);
  });
});
