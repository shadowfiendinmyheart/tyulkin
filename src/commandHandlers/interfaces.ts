import { NavigateFunction } from "react-router";
import { CaretMode, CrtMode, SecretId, ThemeMode } from "../domain";
import { CommandDescriptionKeys, Languages, TFunction } from "../localization/interfaces";
import { AppActionType } from "../store/app/interfaces";
import { ConsoleActionType, LogContent } from "../store/console/interfaces";

export interface CommandContext {
  log: (content: LogContent) => void;
  t: TFunction;
  language: Languages;
  theme: ThemeMode;
  caretMode: CaretMode;
  crtMode: CrtMode;
  changeLanguage: (language: Languages) => Promise<TFunction>;
  consoleDispatch: (action: ConsoleActionType) => void;
  appDispatch: (action: AppActionType) => void;
  navigate: NavigateFunction;
  pathname: string;
  // address of the current page, with the base path: "/tyulkin/settings"
  pageHref: string;
  // commands executed before this one, newest first
  history: string[];
  // every command available on the current page: page commands first, then global ones
  commands: Command[];
}

// what is needed to match and run a command
export interface CommandBase {
  name: string;
  // alternative spellings, e.g. "cd .." for "back"; work and autocomplete like the name
  aliases?: string[];
  // values of the single optional argument, used for autocomplete;
  // a command without params accepts no arguments
  params?: readonly string[];
  // takes any number of arguments, as typed (`cowsay hello world`)
  anyArgs?: true;
  run: (ctx: CommandContext, args: string[]) => void;
}

export interface Command extends CommandBase {
  descriptionKey: CommandDescriptionKeys;
  // false: `share` skips it (no output worth a link, or only navigates: link the page instead)
  shareable?: false;
}

// an easter egg (TASK-63): runs on any page, but is not in help, ls, autocomplete or
// "did you mean", and is not shared; running it counts the secret as found
export interface SecretCommand extends CommandBase {
  secret: SecretId;
}
