export interface CommonDictionary {
  welcome: string;
  settingsWelcome: string;
  education: string;
  about: string;
  experience: string;
  skills: string;
  projects: string;
  contacts: string;
  loading: string;
  // accessible name of the command line input
  inputLabel: string;
  // shown next to the empty command line until the first command is executed
  inputHint: string;
}

// one line of `help` per command, see commandHandlers/commands
export interface CommandDescriptionDictionary {
  helpBack: string;
  helpClear: string;
  helpMenu: string;
  helpHelp: string;
  helpLs: string;
  helpEducation: string;
  helpAbout: string;
  helpExperience: string;
  helpSkills: string;
  helpProjects: string;
  helpContacts: string;
  helpSettings: string;
  helpSetTheme: string;
  helpShowThemes: string;
  helpSetCaret: string;
  helpShowCarets: string;
  helpSetLanguage: string;
  helpShowLanguages: string;
}

export interface DictionaryWithArgs {
  ["404command"]: string;
  // the closest command when an unknown one is typed
  didYouMean: string;
  wrongCaret: string;
  changeCaret: string;
  caretList: string;
  wrongLanguage: string;
  changeLanguage: string;
  changeLanguageError: string;
  languageList: string;
  wrongTheme: string;
  changeTheme: string;
  themeList: string;
}

export type Dictionary = CommonDictionary & CommandDescriptionDictionary & DictionaryWithArgs;

export type CommonDictionaryKeys = keyof CommonDictionary;
export type CommandDescriptionKeys = keyof CommandDescriptionDictionary;
export type DictionaryWithArgsKeys = keyof DictionaryWithArgs;

type LocaleWithArgsGenerator<Key extends DictionaryWithArgsKeys, Args extends string> = {
  key: Key;
  args: Record<Args, string>;
};

type CommonLocale = { key: CommonDictionaryKeys | CommandDescriptionKeys };
type NotFoundLocale = LocaleWithArgsGenerator<"404command", "unknownCommand">;
type DidYouMeanLocale = LocaleWithArgsGenerator<"didYouMean", "command">;
type WrongCaretLocale = LocaleWithArgsGenerator<"wrongCaret", "caretName">;
type ChangeCaretLocale = LocaleWithArgsGenerator<"changeCaret", "caretName">;
type CaretListLocale = LocaleWithArgsGenerator<"caretList", "carets">;
type WrongLanguageLocale = LocaleWithArgsGenerator<"wrongLanguage", "languageName">;
type ChangeLanguageLocale = LocaleWithArgsGenerator<"changeLanguage", "languageName">;
type ChangeLanguageErrorLocale = LocaleWithArgsGenerator<"changeLanguageError", "languageName">;
type LanguageListLocale = LocaleWithArgsGenerator<"languageList", "languages">;
type WrongThemeLocale = LocaleWithArgsGenerator<"wrongTheme", "themeName">;
type ChangeThemeLocale = LocaleWithArgsGenerator<"changeTheme", "themeName">;
type ThemeListLocale = LocaleWithArgsGenerator<"themeList", "themes">;

export type LocaleWithArgs =
  | NotFoundLocale
  | DidYouMeanLocale
  | WrongCaretLocale
  | ChangeCaretLocale
  | CaretListLocale
  | WrongLanguageLocale
  | ChangeLanguageLocale
  | ChangeLanguageErrorLocale
  | LanguageListLocale
  | WrongThemeLocale
  | ChangeThemeLocale
  | ThemeListLocale;
export type LocaleParams = CommonLocale | LocaleWithArgs;

export const languages = ["ru", "eng"] as const;
export type Languages = (typeof languages)[number];

export type TFunction = (params: LocaleParams) => string;
