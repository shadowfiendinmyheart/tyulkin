export interface CommonDictionary {
  welcome: string;
  settingsWelcome: string;
  projectsWelcome: string;
  // lines typed out before the first welcome of a session, one per line
  bootLines: string;
  education: string;
  about: string;
  experience: string;
  skills: string;
  projects: string;
  contacts: string;
  // section titles of the regular (gui) view of the CV
  guiContacts: string;
  guiExperience: string;
  guiSkills: string;
  guiProjects: string;
  guiEducation: string;
  // the print button of the gui view: printing is how the CV is saved as PDF
  guiPrint: string;
  // the terminal ⇄ gui switch
  switchToGui: string;
  switchToTerminal: string;
  loading: string;
  // accessible name of the command line input
  inputLabel: string;
  // accessible name of the quick command chips over the command line
  quickCommandsLabel: string;
  // shown over the `matrix` digital rain
  matrixExit: string;
  // `changelog` in a build without the git history
  changelogEmpty: string;
  // `projects` header over the GitHub repositories fetched at build time (TASK-68)
  projectsGithub: string;
  // easter eggs (TASK-63), see commandHandlers/commands/secrets
  sudo: string;
  sudoHireMe: string;
  // the fake removal, line by line, then the joke
  rmRf: string;
  rmRfJoke: string;
  vimExit: string;
  // `cowsay` without a text
  cowsayDefault: string;
  // entries of `fortune`, separated by a line of "%"
  fortunes: string;
  coffee: string;
  // how the Konami code is listed by `secrets`
  secretKonami: string;
  // the state of the CRT effect in `set crt` messages
  crtOn: string;
  crtOff: string;
  // `history` (TASK-61): nothing to list, `history -c`, wrong arguments
  historyEmpty: string;
  historyCleared: string;
  historyUsage: string;
  // `!!` with no previous command
  historyNotFound: string;
  // something other than grep after "|"
  pipeUsage: string;
  // the prompt of Ctrl+R, the query goes after it; failing: nothing contains the query
  reverseSearch: string;
  reverseSearchFailing: string;
  // accessible name of the command line while it searches the history
  reverseSearchLabel: string;
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
  helpSetCrt: string;
  helpSetLanguage: string;
  helpShowLanguages: string;
  helpNeofetch: string;
  helpGui: string;
  helpCv: string;
  helpShare: string;
  helpMatrix: string;
  helpChangelog: string;
  helpSecrets: string;
  helpHistory: string;
  helpEcho: string;
  helpWhoami: string;
  helpPwd: string;
  helpCd: string;
  helpCat: string;
  helpTree: string;
  helpDate: string;
}

export interface DictionaryWithArgs {
  ["404command"]: string;
  // shown next to the empty command line until the first command is executed
  inputHint: string;
  // the first line of the boot, $date is the previous visit
  bootLastLogin: string;
  // the closest command when an unknown one is typed
  didYouMean: string;
  // offered to a visitor who has done nothing for a while; $link is the label of the switch
  guiHint: string;
  // `cv` without --download: how to use it
  cvUsage: string;
  // `share` with no command to link, $help is a command placeholder
  shareNothing: string;
  // `share`: $link is the deep link that runs $command, copied or not
  shareCopied: string;
  shareNotCopied: string;
  wrongCaret: string;
  changeCaret: string;
  caretList: string;
  // `set crt` (TASK-64): $state is on or off, $modes lists both
  crtStatus: string;
  wrongCrt: string;
  changeCrt: string;
  wrongLanguage: string;
  changeLanguage: string;
  changeLanguageError: string;
  languageList: string;
  wrongTheme: string;
  changeTheme: string;
  themeList: string;
  // the Konami code switched to the secret theme $themeName
  secretTheme: string;
  // `changelog`: $total changes, the latest $shown are listed, $all is a command placeholder
  changelog: string;
  // `changelog` listing all $total changes
  changelogAll: string;
  // the stars column of `projects` (TASK-68), $stars is the count
  projectsStars: string;
  // `vim`: $quit and $forceQuit are command placeholders
  vim: string;
  // `sl`: $ls is a command placeholder
  sl: string;
  // `secrets`: $found of $total secrets; all $total found; $list of found ones (placeholders)
  secretsProgress: string;
  secretsAll: string;
  secretsList: string;
  // a secret found for the first time, $secrets is a command placeholder
  secretFound: string;
  // "key: value" lines of neofetch, the first line is the title
  neofetch: string;
  // the virtual file system (TASK-60): $command failed on the $path typed by the visitor
  fsNotFound: string;
  fsNotDirectory: string;
  fsIsDirectory: string;
  // `cat` without a file, $ls is a command placeholder
  catUsage: string;
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
// help and ls are command placeholders, see withNodes
type NotFoundLocale = LocaleWithArgsGenerator<"404command", "unknownCommand" | "help" | "ls">;
type InputHintLocale = LocaleWithArgsGenerator<"inputHint", "help">;
type DidYouMeanLocale = LocaleWithArgsGenerator<"didYouMean", "command">;
type GuiHintLocale = LocaleWithArgsGenerator<"guiHint", "command" | "link">;
// download and gui are command placeholders, see withNodes
type CvUsageLocale = LocaleWithArgsGenerator<"cvUsage", "download" | "gui">;
type ShareNothingLocale = LocaleWithArgsGenerator<"shareNothing", "help">;
type ShareCopiedLocale = LocaleWithArgsGenerator<"shareCopied", "command" | "link">;
type ShareNotCopiedLocale = LocaleWithArgsGenerator<"shareNotCopied", "command" | "link">;
type BootLastLoginLocale = LocaleWithArgsGenerator<"bootLastLogin", "date">;
type WrongCaretLocale = LocaleWithArgsGenerator<"wrongCaret", "caretName">;
type ChangeCaretLocale = LocaleWithArgsGenerator<"changeCaret", "caretName">;
type CaretListLocale = LocaleWithArgsGenerator<"caretList", "carets">;
type CrtStatusLocale = LocaleWithArgsGenerator<"crtStatus", "state" | "modes">;
type WrongCrtLocale = LocaleWithArgsGenerator<"wrongCrt", "crtName" | "modes">;
type ChangeCrtLocale = LocaleWithArgsGenerator<"changeCrt", "state">;
type WrongLanguageLocale = LocaleWithArgsGenerator<"wrongLanguage", "languageName">;
type ChangeLanguageLocale = LocaleWithArgsGenerator<"changeLanguage", "languageName">;
type ChangeLanguageErrorLocale = LocaleWithArgsGenerator<"changeLanguageError", "languageName">;
type LanguageListLocale = LocaleWithArgsGenerator<"languageList", "languages">;
type WrongThemeLocale = LocaleWithArgsGenerator<"wrongTheme", "themeName">;
type ChangeThemeLocale = LocaleWithArgsGenerator<"changeTheme", "themeName">;
type ThemeListLocale = LocaleWithArgsGenerator<"themeList", "themes">;
type SecretThemeLocale = LocaleWithArgsGenerator<"secretTheme", "themeName">;
type ChangelogLocale = LocaleWithArgsGenerator<"changelog", "total" | "shown" | "all">;
type ChangelogAllLocale = LocaleWithArgsGenerator<"changelogAll", "total">;
type ProjectsStarsLocale = LocaleWithArgsGenerator<"projectsStars", "stars">;
type VimLocale = LocaleWithArgsGenerator<"vim", "quit" | "forceQuit">;
type SlLocale = LocaleWithArgsGenerator<"sl", "ls">;
type SecretsProgressLocale = LocaleWithArgsGenerator<"secretsProgress", "found" | "total">;
type SecretsAllLocale = LocaleWithArgsGenerator<"secretsAll", "total">;
type SecretsListLocale = LocaleWithArgsGenerator<"secretsList", "list">;
type SecretFoundLocale = LocaleWithArgsGenerator<"secretFound", "found" | "total" | "secrets">;
type FsErrorLocale = LocaleWithArgsGenerator<
  "fsNotFound" | "fsNotDirectory" | "fsIsDirectory",
  "command" | "path"
>;
type CatUsageLocale = LocaleWithArgsGenerator<"catUsage", "ls">;
type NeofetchLocale = LocaleWithArgsGenerator<
  "neofetch",
  "uptime" | "theme" | "caret" | "language"
>;

export type LocaleWithArgs =
  | NotFoundLocale
  | InputHintLocale
  | DidYouMeanLocale
  | GuiHintLocale
  | CvUsageLocale
  | ShareNothingLocale
  | ShareCopiedLocale
  | ShareNotCopiedLocale
  | BootLastLoginLocale
  | WrongCaretLocale
  | ChangeCaretLocale
  | CaretListLocale
  | CrtStatusLocale
  | WrongCrtLocale
  | ChangeCrtLocale
  | WrongLanguageLocale
  | ChangeLanguageLocale
  | ChangeLanguageErrorLocale
  | LanguageListLocale
  | WrongThemeLocale
  | ChangeThemeLocale
  | ThemeListLocale
  | SecretThemeLocale
  | ChangelogLocale
  | ChangelogAllLocale
  | ProjectsStarsLocale
  | VimLocale
  | SlLocale
  | SecretsProgressLocale
  | SecretsAllLocale
  | SecretsListLocale
  | SecretFoundLocale
  | NeofetchLocale
  | FsErrorLocale
  | CatUsageLocale;
export type LocaleParams = CommonLocale | LocaleWithArgs;

export const languages = ["ru", "eng"] as const;
export type Languages = (typeof languages)[number];

export type TFunction = (params: LocaleParams) => string;
