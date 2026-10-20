export type Styles = {
  restart: string;
  screen: string;
  status: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
