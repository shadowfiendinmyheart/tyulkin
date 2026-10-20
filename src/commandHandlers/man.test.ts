import { describe, expect, it } from "vitest";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import ru from "../localization/dictionaries/ru.json";
import { LogNode } from "../store/console/interfaces";
import { globalCommands } from "./commands";
import { Command } from "./interfaces";
import { findHelpTarget, getManPage } from "./man";

const t = createT(eng);
const run = () => undefined;

// the page as shown: a command node shows its label or the command
const toText = (nodes: LogNode[]) =>
  nodes
    .map((node) => {
      if (typeof node === "string") return node;
      if (node.type === "command") return node.label ?? node.command;
      return "text" in node ? node.text : "";
    })
    .join("");

describe("findHelpTarget (TASK-89)", () => {
  const ls: Command = { name: "ls", params: ["projects"], descriptionKey: "helpLs", run };
  const setTheme: Command = {
    name: "set theme",
    params: ["dark"],
    descriptionKey: "helpSetTheme",
    run,
  };
  const ask: Command = { name: "ask", anyArgs: true, descriptionKey: "helpAsk", run };
  const commands = [ls, setTheme, ask];

  it("finds the command before a trailing --help", () => {
    expect(findHelpTarget(commands, "ls --help")?.command).toBe(ls);
    expect(findHelpTarget(commands, "ls projects --help")?.command).toBe(ls);
    expect(findHelpTarget(commands, "  set theme   dark --HELP ")?.command).toBe(setTheme);
    expect(findHelpTarget(commands, "ask --help")?.command).toBe(ask);
  });

  it("finds nothing without the flag at the end, or for an unknown command", () => {
    expect(findHelpTarget(commands, "ls")).toBeUndefined();
    expect(findHelpTarget(commands, "--help")).toBeUndefined();
    expect(findHelpTarget(commands, "--help ls")).toBeUndefined();
    expect(findHelpTarget(commands, "ls --helpful")).toBeUndefined();
    expect(findHelpTarget(commands, "cat --help")).toBeUndefined();
    expect(findHelpTarget(commands, "ls a b --help")).toBeUndefined();
  });

  it("leaves a later flag to a command with any arguments", () => {
    expect(findHelpTarget(commands, "ask how to use --help")).toBeUndefined();
  });
});

describe("getManPage (TASK-89)", () => {
  it("shows the name, synopsis and description of a command", () => {
    const clear: Command = { name: "clear", descriptionKey: "helpClear", run };
    expect(toText(getManPage(clear, t))).toBe(
      "NAME\n    clear\n\nSYNOPSIS\n    clear\n\nDESCRIPTION\n    clear the console",
    );
  });

  it("lists aliases and params as commands to click", () => {
    const setTheme: Command = {
      name: "set theme",
      aliases: ["theme"],
      params: ["dark", "light"],
      descriptionKey: "helpSetTheme",
      run,
    };
    const page = getManPage(setTheme, t);
    expect(toText(page)).toBe(
      "NAME\n    set theme\n\nSYNOPSIS\n    set theme [argument]\n\nDESCRIPTION\n    " +
        `${eng.helpSetTheme}\n\nALIASES\n    theme\n\nPARAMS\n    dark, light`,
    );
    expect(page).toContainEqual({ type: "command", command: "theme" });
    expect(page).toContainEqual({ type: "command", command: "set theme dark", label: "dark" });
  });

  it("shows any number of arguments in the synopsis", () => {
    const echo = globalCommands.find(({ name }) => name === "echo")!;
    expect(toText(getManPage(echo, t))).toContain("SYNOPSIS\n    echo [argument...]");
  });

  it("takes the headers from the dictionary", () => {
    const clear: Command = { name: "clear", descriptionKey: "helpClear", run };
    const page = getManPage(clear, createT(ru));
    expect(page[0]).toEqual({ type: "text", text: "ИМЯ", color: "accent" });
    expect(toText(page)).toContain(`ОПИСАНИЕ\n    ${ru.helpClear}`);
  });
});
