export type Styles = {
  card: string;
  header: string;
  link: string;
  main: string;
  name: string;
  page: string;
  paragraph: string;
  paragraphTitle: string;
  print: string;
  title: string;
  toolbar: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
