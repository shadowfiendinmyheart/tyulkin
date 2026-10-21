import { CONSOLE_ROUTES } from "./const";

export type ConsoleRouteValues = (typeof CONSOLE_ROUTES)[keyof typeof CONSOLE_ROUTES];

// navigation state of the gui page: `cv --download` opens it with the print dialog
export interface GuiLocationState {
  print?: boolean;
}

// navigation state of a console page: a command clicked in the output of another page runs
// there once it is open (TASK-103), as if it was typed after `cd`
export interface ConsoleLocationState {
  command?: string;
}
