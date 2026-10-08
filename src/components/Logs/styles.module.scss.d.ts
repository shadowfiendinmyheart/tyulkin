export type Styles = {
  link: string;
  list: string;
  log: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
