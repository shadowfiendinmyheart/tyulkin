export interface CommonDictionary {
  welcome: string;
  settingsWelcome: string;
  education: string;
  about: string;
  help: string;
  loading: string;
}

export interface DictionaryWithArgs {
  ["404command"]: string;
  wrongCaret: string;
  changeCaret: string;
  wrongLanguage: string;
  changeLanguage: string;
}

export type Dictionary = CommonDictionary & DictionaryWithArgs;

export type DictionaryKeys = keyof Dictionary;
export type DictionaryWithArgsKeys = keyof DictionaryWithArgs;

type LocaleWithArgsGenerator<Key extends DictionaryWithArgsKeys, Args extends string> = {
  key: Key;
  args: Record<Args, string>;
};

type DefaultLocale = { key: DictionaryKeys };
type NotFoundLocale = LocaleWithArgsGenerator<"404command", "unknownCommand">;
type WrongCaretLocale = LocaleWithArgsGenerator<"wrongCaret", "caretName">;
type ChangeCaretLocale = LocaleWithArgsGenerator<"changeCaret", "caretName">;
type WrongLanguageLocale = LocaleWithArgsGenerator<"wrongLanguage", "languageName">;
type ChangeLanguageLocale = LocaleWithArgsGenerator<"changeLanguage", "languageName">;

export type LocaleWithArgs =
  | NotFoundLocale
  | WrongCaretLocale
  | ChangeCaretLocale
  | WrongLanguageLocale
  | ChangeLanguageLocale;
export type LocaleParams = DefaultLocale | LocaleWithArgs;

export const languages = ["ru", "eng"] as const;
export type Languages = (typeof languages)[number];
