import { describe, expect, it } from "vitest";
import { getAllCommandsWithParams, getAutocompleteCommands, separateCommand } from "./utils";

const commands = [{ command: "set theme", params: ["Black", "White"] }, { command: "show themes" }];

describe("separateCommand", () => {
  it("splits a command and its param", () => {
    expect(separateCommand(commands, "set theme Black")).toEqual({
      command: "set theme",
      params: ["Black"],
    });
  });

  it("accepts a command with params but without an argument", () => {
    expect(separateCommand(commands, "set theme")).toEqual({ command: "set theme", params: [] });
  });

  it("ignores extra whitespace", () => {
    expect(separateCommand(commands, "  set   theme  Black ")).toEqual({
      command: "set theme",
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

  it("returns undefined for an unknown command", () => {
    expect(separateCommand(commands, "unknown")).toBeUndefined();
  });
});

describe("getAllCommandsWithParams", () => {
  it("expands every param into a separate command", () => {
    expect(getAllCommandsWithParams(commands)).toEqual([
      "set theme Black",
      "set theme White",
      "show themes",
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

  it("returns everything for an empty input and nothing for no match", () => {
    expect(getAutocompleteCommands(all, "")).toEqual(all);
    expect(getAutocompleteCommands(all, "x")).toEqual([]);
  });
});
