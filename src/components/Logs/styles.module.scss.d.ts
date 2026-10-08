export type Styles = {
  list: string;
  log: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
