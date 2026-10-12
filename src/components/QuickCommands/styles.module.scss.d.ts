export type Styles = {
  chip: string;
  quickCommands: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
