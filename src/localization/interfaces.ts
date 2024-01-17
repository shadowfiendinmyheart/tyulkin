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
  caretList: string;
  wrongLanguage: string;
  changeLanguage: string;
  languageList: string;
}

export type Dictionary = CommonDictionary & DictionaryWithArgs;

export type CommonDictionaryKeys = keyof CommonDictionary;
export type DictionaryWithArgsKeys = keyof DictionaryWithArgs;

type LocaleWithArgsGenerator<Key extends DictionaryWithArgsKeys, Args extends string> = {
  key: Key;
  args: Record<Args, string>;
};

type CommonLocale = { key: CommonDictionaryKeys };
type NotFoundLocale = LocaleWithArgsGenerator<"404command", "unknownCommand">;
type WrongCaretLocale = LocaleWithArgsGenerator<"wrongCaret", "caretName">;
type ChangeCaretLocale = LocaleWithArgsGenerator<"changeCaret", "caretName">;
type CaretListLocale = LocaleWithArgsGenerator<"caretList", "carets">;
type WrongLanguageLocale = LocaleWithArgsGenerator<"wrongLanguage", "languageName">;
type ChangeLanguageLocale = LocaleWithArgsGenerator<"changeLanguage", "languageName">;
type LanguageListLocale = LocaleWithArgsGenerator<"languageList", "languages">;

export type LocaleWithArgs =
  | NotFoundLocale
  | WrongCaretLocale
  | ChangeCaretLocale
  | CaretListLocale
  | WrongLanguageLocale
  | ChangeLanguageLocale
  | LanguageListLocale;
export type LocaleParams = CommonLocale | LocaleWithArgs;

export const languages = ["ru", "eng"] as const;
export type Languages = (typeof languages)[number];
