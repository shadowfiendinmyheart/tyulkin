export type Styles = {
  accent: string;
  command: string;
  error: string;
  link: string;
  list: string;
  log: string;
  muted: string;
  pre: string;
  table: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
