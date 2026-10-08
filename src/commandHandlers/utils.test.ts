import { describe, expect, it } from "vitest";
import { Command } from "./interfaces";
import {
  getAllCommandsWithParams,
  getAutocompleteCommands,
  getHelpLine,
  getParentPath,
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

describe("getHelpLine", () => {
  it("lists aliases next to the name", () => {
    expect(getHelpLine(back, "go back")).toBe("back (cd .., cd..) - go back");
    expect(getHelpLine(showThemes, "list themes")).toBe("show themes - list themes");
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
