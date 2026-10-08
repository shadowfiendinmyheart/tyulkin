export type Styles = {
  blink: string;
  blinkText: string;
  block: string;
  char: string;
  line: string;
  spaceChar: string;
  underline: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
