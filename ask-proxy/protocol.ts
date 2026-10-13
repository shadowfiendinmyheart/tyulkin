// what the site (src/commandHandlers/ask.ts) and the proxy agree on; imported by both, so it
// imports nothing but types and constants
export { languages as answerLanguages } from "../src/localization/interfaces";
export type { Languages as AnswerLanguage } from "../src/localization/interfaces";

// the body of the 429 for an IP that has asked enough today (a plain 429: wait a minute)
export const IP_DAILY_LIMIT_REACHED = "Daily limit reached";

// a longer question is not sent by the site and is rejected by the proxy
export const MAX_QUESTION_LENGTH = 300;
