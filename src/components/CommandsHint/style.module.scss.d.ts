export type Styles = {
  command: string;
  commandsHint: string;
  hide: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
