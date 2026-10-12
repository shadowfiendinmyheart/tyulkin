export interface HandlerContextType {
  // runs a command as if it was typed and entered: history, echo, output
  // fromLink: a deep link (?cmd=) runs no easter eggs, so nobody can link the owner's site
  // showing their own text (`cowsay …`), and secrets are found by the visitor only
  executeCommand: (command: string, options?: { fromLink?: boolean }) => void;
  allCommands: string[];
}
