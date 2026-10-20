export type Styles = {
  backdrop: string;
  button: string;
  command: string;
  description: string;
  empty: string;
  icon: string;
  list: string;
  match: string;
  option: string;
  palette: string;
  search: string;
  selected: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
