export type Styles = {
  canvas: string;
  hint: string;
  matrix: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
