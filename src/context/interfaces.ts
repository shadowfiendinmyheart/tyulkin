export interface HandlerContextType {
  commandHandler: (command: string) => boolean;
  allCommands?: string[];
}
