// pages of the terminal: each has its own commands and welcome (see commandsByRoute) and is
// a directory of the virtual file system (commandHandlers/fileSystem.ts): "/" is the home
export const CONSOLE_ROUTES = {
  MAIN: "/",
  PROJECTS: "/projects",
  SETTINGS: "/settings",
} as const;

export const ROUTES = {
  ...CONSOLE_ROUTES,
  // the CV as a regular page, for those who don't get along with the terminal
  GUI: "/gui",
} as const;

// query parameter of a deep link: /?cmd=projects runs `projects` when the page opens
export const COMMAND_PARAM = "cmd";
