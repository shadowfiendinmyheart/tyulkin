export type Styles = {
  quiet: string;
  switch: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
