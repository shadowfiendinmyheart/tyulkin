export type Styles = {
  ascii: string;
  blink: string;
  cursor: string;
  message: string;
  prompt: string;
  status: string;
  wrapper: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
