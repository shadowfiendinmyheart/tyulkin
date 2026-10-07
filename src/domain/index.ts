// domain types shared by components, store, storage and commands;
// kept free of imports so any layer can depend on them without cycles

export enum CaretMode {
  Line = "line",
  Underline = "underline",
  Block = "block",
}

export const themeModes = ["White", "Black", "Light", "Dark", "Hacker"] as const;
export type ThemeMode = (typeof themeModes)[number];
