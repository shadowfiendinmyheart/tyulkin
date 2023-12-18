import { languages, Languages } from "./interfaces";

export const isLanguage = (x: any): x is Languages => languages.includes(x);
