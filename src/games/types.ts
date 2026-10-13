// the mini-games (TASK-66): pure state machines drawn as a character grid; the screen
// (components/Game/GameScreen) runs the timer, reads keys and swipes and keeps the record

// what a key or a swipe asks for; a game ignores what it has no use for
export type GameAction = "up" | "down" | "left" | "right" | "drop";

// Math.random in the app, a fixed sequence in tests
export type Random = () => number;

// method syntax: a definition of any state fits GameDefinition<unknown> (see games/index)
export interface GameDefinition<S> {
  create(random: Random): S;
  // ms until the next step on its own; undefined: the game moves by input only
  tickMs?(state: S): number;
  tick?(state: S, random: Random): S;
  act(state: S, action: GameAction, random: Random): S;
  // lines of the grid, all of one length
  render(state: S): string[];
  score(state: S): number;
  isOver(state: S): boolean;
  // the controls under the grid
  hintKey: "gameHintMove" | "gameHintTetris";
  // a swipe down and a tap on a touch screen (a tap restarts a finished game anyway)
  swipeDown: GameAction;
  tap?: GameAction;
}

export interface Point {
  x: number;
  y: number;
}

export const randomItem = <T>(items: readonly T[], random: Random): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];
