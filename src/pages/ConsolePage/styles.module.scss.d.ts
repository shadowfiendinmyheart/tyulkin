export type Styles = {
  crt: string;
  crtFlicker: string;
  crtGlow: string;
  crtOff: string;
  crtOffGlow: string;
  page: string;
  shuttingDown: string;
  toolbar: string;
  wrapper: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
