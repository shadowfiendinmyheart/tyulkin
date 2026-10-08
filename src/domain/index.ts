// domain types shared by components, store, storage and commands;
// kept free of imports so any layer can depend on them without cycles

export enum CaretMode {
  Line = "line",
  Underline = "underline",
  Block = "block",
}

export const themeModes = ["White", "Black", "Light", "Dark", "Hacker"] as const;
export type ThemeMode = (typeof themeModes)[number];

export const caretModes = Object.values(CaretMode);

// narrows an arbitrary (e.g. user- or storage-provided) value to one of the allowed ones
export const oneOf = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  allowed.find((item) => item === value);
