export type Styles = {
  accent: string;
  art: string;
  error: string;
  link: string;
  list: string;
  log: string;
  muted: string;
  pre: string;
  table: string;
  text: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
