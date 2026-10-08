export type Styles = {
  chars: string;
  hint: string;
  locator: string;
  nativeInput: string;
  wrapper: string;
  zeroChar: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
