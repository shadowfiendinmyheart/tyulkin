import { NavigateFunction } from "react-router";
import { CaretMode, ThemeMode } from "../domain";
import { CommandDescriptionKeys, Languages, TFunction } from "../localization/interfaces";
import { AppActionType } from "../store/app/interfaces";
import { ConsoleActionType, LogContent } from "../store/console/interfaces";

export interface CommandContext {
  log: (content: LogContent) => void;
  t: TFunction;
  language: Languages;
  theme: ThemeMode;
  caretMode: CaretMode;
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

export interface Command {
  name: string;
  // alternative spellings, e.g. "cd .." for "back"; work and autocomplete like the name
  aliases?: string[];
  // values of the single optional argument, used for autocomplete;
  // a command without params accepts no arguments
  params?: readonly string[];
  descriptionKey: CommandDescriptionKeys;
  // false: `share` skips it (no output worth a link, or only navigates: link the page instead)
  shareable?: false;
  run: (ctx: CommandContext, args: string[]) => void;
}
