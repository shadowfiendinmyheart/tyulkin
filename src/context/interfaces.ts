import { HighlightKind } from "../commandHandlers/highlight";
import { PaletteEntry } from "../commandHandlers/palette";
import { CommandDescriptionKeys } from "../localization/interfaces";
import { ConsoleRouteValues } from "../router/interfaces";

export interface HandlerContextType {
  // runs a command as if it was typed and entered: history, echo, output
  // fromLink: a deep link (?cmd=) runs no easter eggs, so nobody can link the owner's site
  // showing their own text (`cowsay …`), and secrets are found by the visitor only
  // route: the page the command was printed on (TASK-103): from another page it opens that one
  // and runs there, as `cd` and the command typed would
  executeCommand: (
    command: string,
    options?: { fromLink?: boolean; route?: ConsoleRouteValues },
  ) => void;
  allCommands: string[];
  // the description of the command a Tab completion runs, for the completion menu (TASK-88)
  describeCompletion: (completion: string) => CommandDescriptionKeys | undefined;
  // the kind of each char of the typed line, for fish-like highlighting (TASK-86)
  highlight: (line: string) => HighlightKind[];
  // what the command palette (Ctrl+K, TASK-90) offers on the page
  paletteEntries: PaletteEntry[];
}
