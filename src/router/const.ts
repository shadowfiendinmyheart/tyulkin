// pages of the terminal: each has its own commands and welcome (see commandsByRoute)
export const CONSOLE_ROUTES = {
  MAIN: "/",
  SETTINGS: "/settings",
} as const;

export const ROUTES = {
  ...CONSOLE_ROUTES,
  // the CV as a regular page, for those who don't get along with the terminal
  GUI: "/gui",
} as const;
