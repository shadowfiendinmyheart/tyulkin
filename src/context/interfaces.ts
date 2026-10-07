export interface HandlerContextType {
  commandHandler: (command: string) => void;
  allCommands: string[];
}
