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
  // accessible name of the Tab completion menu (TASK-88)
  completionsLabel: string;
  // accessible name of the quick command chips over the command line
  quickCommandsLabel: string;
  // accessible name of the extra keys row over the virtual keyboard (TASK-93)
  extraKeysLabel: string;
  // shown over the `matrix` digital rain
  matrixExit: string;
  // the mini-games (TASK-66): the exit button, the end of a game, a chunk that didn't load
  gameExit: string;
  gameOver: string;
  gameLoadFailed: string;
  // the controls under the grid
  gameHintMove: string;
  gameHintTetris: string;
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
  // the state of an on/off setting in `set crt` and `set sound` messages
  stateOn: string;
  stateOff: string;
  // over the themes of `show themes`, each with its colors (TASK-84)
  themeList: string;
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
  // the blog (TASK-70): `blog` without posts, the header of the list; the title of the feed and
  // of the post pages, the description of the feed, the links of a post page (scripts/blog.cjs)
  blogEmpty: string;
  blogList: string;
  blogFeedTitle: string;
  blogFeedDescription: string;
  blogPageAllPosts: string;
  blogPageTerminal: string;
  // `ask` (TASK-71): without a question; while the answer is awaited; no answer (the proxy or the
  // API failed), too many questions from the visitor, the daily budget is spent, the answer broke off
  askUsage: string;
  askThinking: string;
  askUnavailable: string;
  askRateLimited: string;
  askBudgetSpent: string;
  askInterrupted: string;
  // the sections of a man page (TASK-89), and the argument in its synopsis: "ls [argument]"
  manName: string;
  manSynopsis: string;
  manDescription: string;
  manAliases: string;
  manParams: string;
  manArgument: string;
  // `qr` (TASK-96): over the code of the site address, of the vCard; the generator didn't load
  qrSite: string;
  qrVcard: string;
  qrLoadFailed: string;
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
  helpSetSound: string;
  helpSetLanguage: string;
  helpShowLanguages: string;
  helpNeofetch: string;
  helpGui: string;
  helpCv: string;
  helpShare: string;
  helpMatrix: string;
  helpSnake: string;
  helpGame2048: string;
  helpTetris: string;
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
  helpBlog: string;
  helpRead: string;
  helpAsk: string;
  helpMan: string;
  helpQr: string;
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
  // `set sound` (TASK-67): $state is on or off, $modes lists both
  soundStatus: string;
  wrongSound: string;
  changeSound: string;
  wrongLanguage: string;
  changeLanguage: string;
  changeLanguageError: string;
  languageList: string;
  wrongTheme: string;
  changeTheme: string;
  // the Konami code switched to the secret theme $themeName
  secretTheme: string;
  // `changelog`: $total changes, the latest $shown are listed, $all is a command placeholder
  changelog: string;
  // `changelog` listing all $total changes
  changelogAll: string;
  // the stars column of `projects` (TASK-68), $stars is the count
  projectsStars: string;
  // the mini-games (TASK-66): the line over the grid; logged on exit, $game is the command
  gameScore: string;
  gameResult: string;
  gameNewRecord: string;
  // `vim`: $quit and $forceQuit are command placeholders
  vim: string;
  // `sl`: $ls is a command placeholder
  sl: string;
  // `secrets`: $found of $total secrets; all $total found; $list of found ones (placeholders)
  secretsProgress: string;
  secretsAll: string;
  secretsList: string;
  // the toast of a secret found for the first time (TASK-97): $name of the secret, $found of $total
  achievementUnlocked: string;
  // "key: value" lines of neofetch, the first line is the title
  neofetch: string;
  // the virtual file system (TASK-60): $command failed on the $path typed by the visitor
  fsNotFound: string;
  fsNotDirectory: string;
  fsIsDirectory: string;
  // `cat` without a file, $ls is a command placeholder
  catUsage: string;
  // `read` without a post, $blog is a command placeholder; no post $slug typed by the visitor
  readUsage: string;
  readNotFound: string;
  // `ask` with a question longer than $max characters
  askTooLong: string;
  // `man` without a command, $man is a command placeholder; no command $command typed by the visitor
  manUsage: string;
  manNotFound: string;
  // `qr` with an unknown argument, $vcard is a command placeholder
  qrUsage: string;
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
type SoundStatusLocale = LocaleWithArgsGenerator<"soundStatus", "state" | "modes">;
type WrongSoundLocale = LocaleWithArgsGenerator<"wrongSound", "soundName" | "modes">;
type ChangeSoundLocale = LocaleWithArgsGenerator<"changeSound", "state">;
type WrongLanguageLocale = LocaleWithArgsGenerator<"wrongLanguage", "languageName">;
type ChangeLanguageLocale = LocaleWithArgsGenerator<"changeLanguage", "languageName">;
type ChangeLanguageErrorLocale = LocaleWithArgsGenerator<"changeLanguageError", "languageName">;
type LanguageListLocale = LocaleWithArgsGenerator<"languageList", "languages">;
type WrongThemeLocale = LocaleWithArgsGenerator<"wrongTheme", "themeName">;
type ChangeThemeLocale = LocaleWithArgsGenerator<"changeTheme", "themeName">;
type SecretThemeLocale = LocaleWithArgsGenerator<"secretTheme", "themeName">;
type ChangelogLocale = LocaleWithArgsGenerator<"changelog", "total" | "shown" | "all">;
type ChangelogAllLocale = LocaleWithArgsGenerator<"changelogAll", "total">;
type ProjectsStarsLocale = LocaleWithArgsGenerator<"projectsStars", "stars">;
type GameScoreLocale = LocaleWithArgsGenerator<"gameScore", "score" | "record">;
type GameResultLocale = LocaleWithArgsGenerator<"gameResult", "game" | "score" | "record">;
type GameNewRecordLocale = LocaleWithArgsGenerator<"gameNewRecord", "game" | "score">;
type VimLocale = LocaleWithArgsGenerator<"vim", "quit" | "forceQuit">;
type SlLocale = LocaleWithArgsGenerator<"sl", "ls">;
type SecretsProgressLocale = LocaleWithArgsGenerator<"secretsProgress", "found" | "total">;
type SecretsAllLocale = LocaleWithArgsGenerator<"secretsAll", "total">;
type SecretsListLocale = LocaleWithArgsGenerator<"secretsList", "list">;
type AchievementUnlockedLocale = LocaleWithArgsGenerator<
  "achievementUnlocked",
  "name" | "found" | "total"
>;
type FsErrorLocale = LocaleWithArgsGenerator<
  "fsNotFound" | "fsNotDirectory" | "fsIsDirectory",
  "command" | "path"
>;
type CatUsageLocale = LocaleWithArgsGenerator<"catUsage", "ls">;
type ReadUsageLocale = LocaleWithArgsGenerator<"readUsage", "blog">;
type ReadNotFoundLocale = LocaleWithArgsGenerator<"readNotFound", "slug" | "blog">;
type AskTooLongLocale = LocaleWithArgsGenerator<"askTooLong", "max">;
type ManUsageLocale = LocaleWithArgsGenerator<"manUsage", "man">;
type ManNotFoundLocale = LocaleWithArgsGenerator<"manNotFound", "command">;
type QrUsageLocale = LocaleWithArgsGenerator<"qrUsage", "vcard">;
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
  | SoundStatusLocale
  | WrongSoundLocale
  | ChangeSoundLocale
  | WrongLanguageLocale
  | ChangeLanguageLocale
  | ChangeLanguageErrorLocale
  | LanguageListLocale
  | WrongThemeLocale
  | ChangeThemeLocale
  | SecretThemeLocale
  | ChangelogLocale
  | ChangelogAllLocale
  | ProjectsStarsLocale
  | GameScoreLocale
  | GameResultLocale
  | GameNewRecordLocale
  | VimLocale
  | SlLocale
  | SecretsProgressLocale
  | SecretsAllLocale
  | SecretsListLocale
  | AchievementUnlockedLocale
  | NeofetchLocale
  | FsErrorLocale
  | CatUsageLocale
  | ReadUsageLocale
  | ReadNotFoundLocale
  | AskTooLongLocale
  | ManUsageLocale
  | ManNotFoundLocale
  | QrUsageLocale;
export type LocaleParams = CommonLocale | LocaleWithArgs;

export const languages = ["ru", "eng"] as const;
export type Languages = (typeof languages)[number];

export type TFunction = (params: LocaleParams) => string;
