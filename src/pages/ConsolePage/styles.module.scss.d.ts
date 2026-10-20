export type Styles = {
  crt: string;
  crtFlicker: string;
  crtGlow: string;
  page: string;
  toolbar: string;
  wrapper: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
