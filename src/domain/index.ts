// domain types shared by components, store, storage and commands;
// kept free of imports so any layer can depend on them without cycles

export enum CaretMode {
  Line = "line",
  Underline = "underline",
  Block = "block",
}

// themes a visitor can list and set
export const themeModes = ["White", "Black", "Light", "Dark", "Hacker"] as const;
// unlocked by the Konami code only: not listed, not settable by `set theme`
export const SECRET_THEME = "Amber";
export const allThemeModes = [...themeModes, SECRET_THEME] as const;
export type ThemeMode = (typeof allThemeModes)[number];

export const caretModes = Object.values(CaretMode);

// the CRT monitor effect over the console (TASK-64): scanlines, glow, vignette, flicker
export const crtModes = ["on", "off"] as const;
export type CrtMode = (typeof crtModes)[number];

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
