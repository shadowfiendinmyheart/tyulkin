import { GlobalCommands } from "../commandHandlers/WithGlobalHandler";
import { MainCommands } from "../commandHandlers/WithMainHandler";

export interface CommonDictionary {
  welcome: string;
  settingsWelcome: string;
  education: string;
  about: string;
  loading: string;
}

export interface DictionaryWithArgs {
  ["404command"]: string;
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
  help: string;
  ["/Help"]: string;
  ["/settingsHelp"]: string;
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
type ChangeLanguageErrorLocale = LocaleWithArgsGenerator<"changeLanguageError", "languageName">;
type LanguageListLocale = LocaleWithArgsGenerator<"languageList", "languages">;
type WrongThemeLocale = LocaleWithArgsGenerator<"wrongTheme", "themeName">;
type ChangeThemeLocale = LocaleWithArgsGenerator<"changeTheme", "themeName">;
type ThemeListLocale = LocaleWithArgsGenerator<"themeList", "themes">;
type HelpLocale = LocaleWithArgsGenerator<"help", GlobalCommands>;
type MainHelpLocale = LocaleWithArgsGenerator<"/Help", MainCommands>;
type SettingsHelpLocale = LocaleWithArgsGenerator<"/settingsHelp", MainCommands>;

export type LocaleWithArgs =
  | NotFoundLocale
  | WrongCaretLocale
  | ChangeCaretLocale
  | CaretListLocale
  | WrongLanguageLocale
  | ChangeLanguageLocale
  | ChangeLanguageErrorLocale
  | LanguageListLocale
  | WrongThemeLocale
  | ChangeThemeLocale
  | ThemeListLocale
  | HelpLocale
  | MainHelpLocale
  | SettingsHelpLocale;
export type LocaleParams = CommonLocale | LocaleWithArgs;

export const languages = ["ru", "eng"] as const;
export type Languages = (typeof languages)[number];
