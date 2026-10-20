// @vitest-environment node
import { fileURLToPath } from "node:url";
import { compile } from "sass";
import { describe, expect, it } from "vitest";
import { allThemeModes, AnsiColor, ansiColors } from "../domain";
import { LogColor } from "../store/console/interfaces";

// colors a text may have (LogColor and the rest of the UI); --caret-color is not text
const TEXT_COLORS = [
  "text",
  "muted",
  "accent",
  "error",
  "success",
  "warning",
] as const satisfies readonly LogColor[];

// every LogColor is checked: a semantic one or an ANSI one
type UncheckedLogColor = Exclude<LogColor, (typeof TEXT_COLORS)[number] | `ansi-${AnsiColor}`>;
const allLogColorsChecked: [UncheckedLogColor] extends [never] ? true : false = true;

// WCAG AA for normal text
const MIN_CONTRAST = 4.5;

// the ANSI colors of the background itself, unreadable on it by design, as in any terminal
const BACKGROUND_ANSI: Record<"dark" | "light", AnsiColor[]> = {
  dark: ["black"],
  light: ["white", "bright-white"],
};

// without the print colors: they are all black on white
const compiled = compile(fileURLToPath(new URL("./themes.scss", import.meta.url))).css;
const css = compiled.slice(0, compiled.indexOf("@media print"));

// custom properties of the rules with this selector; Sass drops the quotes of attribute values,
// so selectors are compared without them
const getTokens = (selector: string): Record<string, string> => {
  const tokens: Record<string, string> = {};
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(",").some((part) => part.trim().replace(/"/g, "") === selector)) continue;
    for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
      tokens[name] = value.trim();
    }
  }
  return tokens;
};

const getThemeTokens = (theme: string) => getTokens(`[data-theme=${theme}]`);

const parseHex = (color: string) => {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color);
  if (!match) throw new Error(`not a hex color: ${color}`);
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
};

// relative luminance, https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
const luminance = (color: string) => {
  const [r, g, b] = parseHex(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

describe("themes", () => {
  it("checks every LogColor", () => {
    expect(allLogColorsChecked).toBe(true);
  });

  // before the app sets data-theme: the Black theme, or White on a light system
  it("the default palettes are the Black and White themes", () => {
    expect(getTokens(":root")).toMatchObject(getThemeTokens("Black"));
    expect(getTokens(":root:not([data-theme])")).toEqual(getThemeTokens("White"));
  });

  it.each(allThemeModes)("%s defines every token", (theme) => {
    const tokens = getThemeTokens(theme);
    const names = [
      "bg-color",
      "caret-color",
      ...TEXT_COLORS.map((color) => `${color}-color`),
      ...ansiColors.map((color) => `ansi-${color}`),
    ];
    expect(Object.keys(tokens).sort()).toEqual(names.sort());
  });

  it.each(allThemeModes)("%s: text colors pass WCAG AA on the background", (theme) => {
    const tokens = getThemeTokens(theme);
    const bg = tokens["bg-color"];
    // a light background is closer to white than to black
    const kind = contrast(bg, "#000") > contrast(bg, "#fff") ? "light" : "dark";
    const textTokens = [
      ...TEXT_COLORS.map((color) => `${color}-color`),
      ...ansiColors
        .filter((color) => !BACKGROUND_ANSI[kind].includes(color))
        .map((color) => `ansi-${color}`),
    ];

    const failing = textTokens
      .map((name) => ({ name, ratio: contrast(tokens[name], bg) }))
      .filter(({ ratio }) => ratio < MIN_CONTRAST)
      .map(({ name, ratio }) => `${name} ${tokens[name]}: ${ratio.toFixed(2)}`);
    expect(failing).toEqual([]);
  });
});
