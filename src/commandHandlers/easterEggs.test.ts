import { describe, expect, it } from "vitest";
import { getCowsay, getFortune } from "./easterEggs";

describe("getCowsay", () => {
  it("puts a short text in a one-line bubble", () => {
    expect(getCowsay("moo").split("\n").slice(0, 3)).toEqual([" _____", "< moo >", " -----"]);
  });

  it("wraps a long text and cuts a long word", () => {
    const lines = getCowsay(`${"a".repeat(45)} b c`).split("\n");
    expect(lines.slice(0, 4)).toEqual([
      ` ${"_".repeat(42)}`,
      `/ ${"a".repeat(40)} \\`,
      `\\ ${"aaaaa b c".padEnd(40)} /`,
      ` ${"-".repeat(42)}`,
    ]);
  });
});

describe("getFortune", () => {
  it("picks an entry of a %-separated list", () => {
    const fortunes = "one\n%\ntwo\nlines\n%\nthree";
    expect(getFortune(fortunes, 0)).toBe("one");
    expect(getFortune(fortunes, 0.5)).toBe("two\nlines");
    expect(getFortune(fortunes, 0.99)).toBe("three");
  });
});
