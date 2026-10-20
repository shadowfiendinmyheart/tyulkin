export type Styles = {
  region: string;
  toast: string;
  toastIn: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
