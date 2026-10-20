export type Styles = {
  autosuggestion: string;
  autosuggestionRest: string;
  chars: string;
  charsAutosuggesting: string;
  highlightArgument: string;
  highlightCommand: string;
  highlightPath: string;
  highlightUnknown: string;
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
