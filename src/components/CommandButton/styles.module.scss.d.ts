export type Styles = {
  command: string;
  swatch: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
