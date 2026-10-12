import { CONSOLE_ROUTES } from "./const";

export type ConsoleRouteValues = (typeof CONSOLE_ROUTES)[keyof typeof CONSOLE_ROUTES];

// navigation state of the gui page: `cv --download` opens it with the print dialog
export interface GuiLocationState {
  print?: boolean;
}
