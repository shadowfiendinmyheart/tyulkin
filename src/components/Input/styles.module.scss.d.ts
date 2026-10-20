export type Styles = {
  chars: string;
  hint: string;
  locator: string;
  nativeInput: string;
  promptDirectory: string;
  promptSymbol: string;
  promptUser: string;
  searchMatch: string;
  wrapper: string;
  zeroChar: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
