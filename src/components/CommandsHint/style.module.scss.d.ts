export type Styles = {
  announcement: string;
  command: string;
  commandsHint: string;
  description: string;
  hide: string;
  menu: string;
  option: string;
  selected: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
