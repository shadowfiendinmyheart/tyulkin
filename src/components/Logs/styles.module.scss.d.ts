export type Styles = {
  accent: string;
  ansiBlack: string;
  ansiBlue: string;
  ansiBrightBlack: string;
  ansiBrightBlue: string;
  ansiBrightCyan: string;
  ansiBrightGreen: string;
  ansiBrightMagenta: string;
  ansiBrightRed: string;
  ansiBrightWhite: string;
  ansiBrightYellow: string;
  ansiCyan: string;
  ansiGreen: string;
  ansiMagenta: string;
  ansiRed: string;
  ansiWhite: string;
  ansiYellow: string;
  art: string;
  error: string;
  link: string;
  list: string;
  log: string;
  muted: string;
  pre: string;
  success: string;
  table: string;
  text: string;
  warning: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
