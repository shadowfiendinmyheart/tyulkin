export interface HandlerContextType {
  // runs a command as if it was typed and entered: history, echo, output
  executeCommand: (command: string) => void;
  allCommands: string[];
}
