import { describe, expect, it } from "vitest";
import { drawFiglet, FIGLET_HEIGHT, FIGLET_WIDTH } from "./figlet";

describe("drawFiglet (TASK-99)", () => {
  it("draws the text in big letters a column apart", () => {
    expect(drawFiglet("hi")).toBe(
      ["#   # ###", "#   #  #", "#####  #", "#   #  #", "#   # ###"].join("\n"),
    );
  });

  it("draws Cyrillic letters and an unknown character as ?", () => {
    expect(drawFiglet("Ж")).toBe(["# # #", "# # #", " ###", "# # #", "# # #"].join("\n"));
    expect(drawFiglet("ПРИВЕТ").split("\n")).toHaveLength(FIGLET_HEIGHT);
    expect(drawFiglet("€")).toBe(drawFiglet("?"));
  });

  it("wraps words into lines of art an empty line apart", () => {
    const art = drawFiglet("hello world and more words");
    const lines = art.split("\n");
    expect(lines.length).toBeGreaterThan(FIGLET_HEIGHT);
    expect(lines[FIGLET_HEIGHT]).toBe("");
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(FIGLET_WIDTH));
  });
});

describe("drawFiglet long words (TASK-99)", () => {
  it("breaks a word wider than a line", () => {
    const lines = drawFiglet("supercalifragilisticexpialidocious").split("\n");
    expect(lines.length).toBeGreaterThan(FIGLET_HEIGHT);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(FIGLET_WIDTH));
  });
});
