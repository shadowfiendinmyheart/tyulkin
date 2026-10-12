import { describe, expect, it } from "vitest";
import { CaretMode } from "../domain";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import ru from "../localization/dictionaries/ru.json";
import { LogNode } from "../store/console/interfaces";
import { getNeofetch, getUptime } from "./neofetch";

describe("getUptime (TASK-54)", () => {
  it("counts whole years and months since July 2022", () => {
    expect(getUptime(new Date(2026, 9, 12), "eng")).toBe("4 years 3 months");
    expect(getUptime(new Date(2026, 9, 12), "ru")).toBe("4 года 3 месяца");
  });

  it("leaves out zero parts", () => {
    expect(getUptime(new Date(2027, 6, 1), "eng")).toBe("5 years");
    expect(getUptime(new Date(2022, 11, 31), "ru")).toBe("5 месяцев");
    expect(getUptime(new Date(2022, 6, 1), "eng")).toBe("0 months");
  });
});

describe("getNeofetch (TASK-54)", () => {
  const nodes = getNeofetch({
    t: createT(eng),
    language: "eng",
    theme: "Hacker",
    caretMode: CaretMode.Underline,
    now: new Date(2026, 9, 12),
  });
  const [table] = nodes as Extract<LogNode, { type: "table" }>[];
  const [[logo, info]] = table.rows;

  it("puts the logo on the left, hidden from screen readers", () => {
    expect(table.type).toBe("table");
    expect(logo).toEqual([expect.objectContaining({ type: "pre", decorative: true })]);
  });

  it("shows the title, the current settings and accented keys on the right", () => {
    const text = info
      .map((node) => (typeof node === "string" ? node : "text" in node ? node.text : ""))
      .join("");
    expect(text).toContain("Ivan Tyulkin\n------------\nRole: Frontend developer\n");
    expect(text).toContain(
      "Uptime: 4 years 3 months\nTheme: Hacker\nCaret: underline\nLanguage: eng",
    );
    expect(info).toContainEqual({ type: "text", text: "Theme:", color: "accent" });
  });

  it("ends with a palette strip of theme colors", () => {
    const palette = info.filter(
      (node) => typeof node !== "string" && node.type === "text" && node.decorative,
    );
    expect(
      palette.map((node) => typeof node !== "string" && node.type === "text" && node.color),
    ).toEqual(["text", "muted", "accent", "error"]);
  });

  it("is localized", () => {
    const [ruTable] = getNeofetch({
      t: createT(ru),
      language: "ru",
      theme: "Black",
      caretMode: CaretMode.Block,
      now: new Date(2026, 9, 12),
    }) as Extract<LogNode, { type: "table" }>[];
    expect(ruTable.rows[0][1]).toContainEqual(" 4 года 3 месяца");
  });
});
