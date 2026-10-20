export type Styles = {
  canvas: string;
  hint: string;
  overlay: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
