import { describe, expect, it } from "vitest";
import { isAltLetter } from "../../utils";
import { applyReadline, ReadlineAction } from "./readline";

// the caret is "|" in the line
const parse = (line: string) => ({ value: line.replace("|", ""), caret: line.indexOf("|") });
const apply = (action: ReadlineAction, line: string) => {
  const next = applyReadline(action, parse(line));
  return next && `${next.value.slice(0, next.caret)}|${next.value.slice(next.caret)}`;
};

describe("readline (TASK-91)", () => {
  it("moves to the line start and end", () => {
    expect(apply("lineStart", "cat ab|out.md")).toBe("|cat about.md");
    expect(apply("lineEnd", "cat ab|out.md")).toBe("cat about.md|");
    expect(apply("lineStart", "|cat")).toBeUndefined();
    expect(apply("lineEnd", "cat|")).toBeUndefined();
  });

  it("kills to the line start and end", () => {
    expect(apply("killToStart", "cat ab|out.md")).toBe("|out.md");
    expect(apply("killToEnd", "cat ab|out.md")).toBe("cat ab|");
    expect(apply("killToStart", "|cat")).toBeUndefined();
    expect(apply("killToEnd", "cat|")).toBeUndefined();
  });

  it("kills the word before the caret up to a space, spaces after it too", () => {
    expect(apply("killWordBack", "cat ~/projects/README.md|")).toBe("cat |");
    expect(apply("killWordBack", "set theme   |")).toBe("set |");
    expect(apply("killWordBack", "set the|me")).toBe("set |me");
    expect(apply("killWordBack", "  |set")).toBe("|set");
    expect(apply("killWordBack", "|set")).toBeUndefined();
  });

  it("moves by words of letters and digits", () => {
    expect(apply("wordBack", "cat ~/projects/README.md|")).toBe("cat ~/projects/README.|md");
    expect(apply("wordBack", "cat ~/projects/|README.md")).toBe("cat ~/|projects/README.md");
    expect(apply("wordBack", "привет мир|")).toBe("привет |мир");
    expect(apply("wordForward", "|cat ~/projects")).toBe("cat| ~/projects");
    expect(apply("wordForward", "cat| ~/projects")).toBe("cat ~/projects|");
    expect(apply("wordBack", "  |set")).toBe("|  set");
    expect(apply("wordForward", "set|  ")).toBe("set  |");
    expect(apply("wordForward", "set|")).toBeUndefined();
  });

  it("deletes the char under the caret", () => {
    expect(apply("deleteChar", "ab|out")).toBe("ab|ut");
    expect(apply("deleteChar", "echo |😀!")).toBe("echo |!");
    expect(apply("deleteChar", "about|")).toBeUndefined();
  });

  it("takes Alt+letter by the physical key, not with other modifiers", () => {
    const alt = (init: KeyboardEventInit) =>
      new KeyboardEvent("keydown", { altKey: true, ...init });
    expect(isAltLetter(alt({ key: "b", code: "KeyB" }), "b")).toBe(true);
    // Option+B on a Mac, Alt+И on the Russian layout
    expect(isAltLetter(alt({ key: "∫", code: "KeyB" }), "b")).toBe(true);
    expect(isAltLetter(alt({ key: "и", code: "KeyB" }), "b")).toBe(true);
    expect(isAltLetter(alt({ key: "f", code: "KeyF" }), "b")).toBe(false);
    expect(isAltLetter(alt({ key: "b", code: "KeyB", ctrlKey: true }), "b")).toBe(false);
    expect(isAltLetter(new KeyboardEvent("keydown", { key: "b", code: "KeyB" }), "b")).toBe(false);
  });
});
