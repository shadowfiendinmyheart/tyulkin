import { NavigateFunction } from "react-router";
import { CommandDescriptionKeys, Languages, TFunction } from "../localization/interfaces";
import { AppActionType } from "../store/app/interfaces";
import { ConsoleActionType } from "../store/console/interfaces";

export interface CommandContext {
  log: (message: string) => void;
  t: TFunction;
  changeLanguage: (language: Languages) => Promise<TFunction>;
  consoleDispatch: (action: ConsoleActionType) => void;
  appDispatch: (action: AppActionType) => void;
  navigate: NavigateFunction;
  pathname: string;
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
  run: (ctx: CommandContext, args: string[]) => void;
}
