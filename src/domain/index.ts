// domain types shared by components, store, storage and commands;
// kept free of imports so any layer can depend on them without cycles

export enum CaretMode {
  Line = "line",
  Underline = "underline",
  Block = "block",
}

// themes a visitor can list and set
export const themeModes = [
  "White",
  "Black",
  "Light",
  "Dark",
  "Hacker",
  "Dracula",
  "Solarized",
  "Gruvbox",
  "Nord",
  "Monokai",
] as const;
// `set theme random` (TASK-73): any listed theme but the current one, never the secret one
export const RANDOM_THEME = "random";
// unlocked by the Konami code only: not listed, not settable by `set theme`
export const SECRET_THEME = "Amber";
export const allThemeModes = [...themeModes, SECRET_THEME] as const;
export type ThemeMode = (typeof allThemeModes)[number];

export const caretModes = Object.values(CaretMode);

// the 16 ANSI colors every theme defines as --ansi-<name> (TASK-80, see styles/themes.scss)
export const ansiColors = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "bright-black",
  "bright-red",
  "bright-green",
  "bright-yellow",
  "bright-blue",
  "bright-magenta",
  "bright-cyan",
  "bright-white",
] as const;
export type AnsiColor = (typeof ansiColors)[number];

// the CRT monitor effect over the console (TASK-64): scanlines, glow, vignette, flicker
export const crtModes = ["on", "off"] as const;
export type CrtMode = (typeof crtModes)[number];

// mechanical keyboard clicks while typing (TASK-67), synthesized with Web Audio
export const soundModes = ["on", "off"] as const;
export type SoundMode = (typeof soundModes)[number];

// the font of the terminal (TASK-83), self-hosted: IBM Plex Mono comes with the page, the others
// are loaded on demand (utils/font.ts)
export const fontModes = ["ibm-plex-mono", "jetbrains-mono", "fira-code"] as const;
export type FontMode = (typeof fontModes)[number];
export const DEFAULT_FONT_MODE: FontMode = "ibm-plex-mono";

// the font size of the terminal (`set fontsize`), whole px
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 24;
export const DEFAULT_FONT_SIZE = 16;

// a font size as typed or stored: "18" or "18px", whole and within the limits; else undefined
export const parseFontSize = (value: unknown): number | undefined => {
  const match = typeof value === "string" ? /^([1-9]\d?)(px)?$/i.exec(value.trim()) : null;
  const size = match ? Number(match[1]) : NaN;
  return size >= FONT_SIZE_MIN && size <= FONT_SIZE_MAX ? size : undefined;
};

// the mini-games in the terminal (TASK-66), each with its own record in storage
export const gameIds = ["snake", "2048", "tetris"] as const;
export type GameId = (typeof gameIds)[number];

// narrows an arbitrary (e.g. user- or storage-provided) value to one of the allowed ones
export const oneOf = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  allowed.find((item) => item === value);

// easter eggs counted by `secrets` (TASK-63): hidden commands and the Konami code
export const secretIds = [
  "sudo",
  "hireMe",
  "rmRf",
  "vim",
  "vimExit",
  "cowsay",
  "fortune",
  "sl",
  "coffee",
  "konami",
] as const;
export type SecretId = (typeof secretIds)[number];

// commands kept in the history (and in storage between visits), the newest ones (TASK-61)
export const HISTORY_LIMIT = 100;
