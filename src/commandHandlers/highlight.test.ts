import { describe, expect, it } from "vitest";
import { CONSOLE_ROUTES } from "../router/const";
import { isExistingPath } from "./fileSystem";
import { highlightLine, HighlightKind } from "./highlight";
import { CommandBase } from "./interfaces";

const command = (name: string, options: Partial<CommandBase> = {}): CommandBase => ({
  name,
  run: () => {},
  ...options,
});
const commands = [
  command("help"),
  command("cat", { params: ["about.md"] }),
  command("back", { aliases: ["cd.."] }),
  command("set theme", { params: ["dark"] }),
];
const secrets = [command("sudo hire-me"), command("sudo", { anyArgs: true })];

const kindLetters: Record<HighlightKind, string> = {
  command: "c",
  unknown: "u",
  argument: "a",
  path: "p",
  text: ".",
};
// one letter per char: "help" -> "cccc"
const highlight = (line: string, hasHistory = true) =>
  highlightLine(
    {
      commandLists: [commands, secrets],
      hasHistory,
      isPath: (typed) => isExistingPath(CONSOLE_ROUTES.MAIN, typed),
    },
    line,
  )
    .map((kind) => kindLetters[kind])
    .join("");

describe("highlightLine (TASK-86)", () => {
  it("colors a known command and an unknown one", () => {
    expect(highlight("help")).toBe("cccc");
    expect(highlight("HeLp")).toBe("cccc");
    expect(highlight("cd..")).toBe("cccc");
    expect(highlight("hel")).toBe("uuu");
    expect(highlight("  foo bar")).toBe("..uuu.aaa");
  });

  it("colors the command as the handler resolves it, its words separated by any spaces", () => {
    expect(highlight("set theme dark")).toBe("ccc.ccccc.aaaa");
    expect(highlight("set  theme")).toBe("ccc..ccccc");
    expect(highlight("sudo hire-me")).toBe("cccc.ccccccc");
    expect(highlight("sudo make me")).toBe("cccc.aaaa.aa");
    // a part of a phrase is not a command
    expect(highlight("set")).toBe("uuu");
    // too many arguments: the command doesn't run
    expect(highlight("help foo")).toBe("uuuu.aaa");
    expect(highlight("set theme dark x")).toBe("uuu.aaaaa.aaaa.a");
  });

  it("underlines arguments that are existing paths", () => {
    expect(highlight("cat about.md")).toBe("ccc.pppppppp");
    expect(highlight("cat ~/projects/README.md")).toBe(`ccc.${"p".repeat(20)}`);
    expect(highlight("cat about.md/")).toBe(`ccc.${"a".repeat(9)}`);
    expect(highlight("cat nope.md")).toBe("ccc.aaaaaaa");
    expect(highlight("cat ..")).toBe("ccc.pp");
    // cat doesn't unquote its argument
    expect(highlight('cat "about.md"')).toBe(`ccc.${"a".repeat(10)}`);
    // the command itself is never a path
    expect(highlight("about.md")).toBe("uuuuuuuu");
  });

  it("colors grep after a pipe and leaves its pattern a plain argument", () => {
    expect(highlight("help | grep about.md")).toBe("cccc...cccc.aaaaaaaa");
    expect(highlight("help | less")).toBe("cccc...uuuu");
    expect(highlight('sudo "a|b"')).toBe("cccc.aaaaa");
    expect(highlight("help |")).toBe("cccc..");
    // grep without a pattern doesn't run
    expect(highlight("help | grep ")).toBe("cccc...uuuu.");
    expect(highlight("help | grep ''")).toBe("cccc...uuuu.aa");
  });

  it("takes !! for a command when there is a previous one", () => {
    expect(highlight("!!")).toBe("cc");
    expect(highlight("!!", false)).toBe("uu");
  });

  it("keeps a position per UTF-16 unit, as the line is drawn", () => {
    expect(highlight("sudo 🙂")).toBe("cccc.aa");
  });
});
