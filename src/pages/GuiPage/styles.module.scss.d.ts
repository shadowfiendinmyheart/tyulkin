export type Styles = {
  event: string;
  eventTitle: string;
  header: string;
  link: string;
  main: string;
  name: string;
  page: string;
  paragraph: string;
  paragraphTitle: string;
  period: string;
  print: string;
  section: string;
  tag: string;
  tagCategory: string;
  tagGroup: string;
  tags: string;
  timeline: string;
  title: string;
  toolbar: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
