export type Styles = {
  exit: string;
  game: string;
  grid: string;
  hint: string;
  score: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
