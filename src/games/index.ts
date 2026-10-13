import { GameId } from "../domain";
import { game2048 } from "./game2048";
import { snake } from "./snake";
import { tetris } from "./tetris";
import { GameDefinition } from "./types";

// loaded with the game screen only (components/Game): not a part of the main bundle
export const games: Record<GameId, GameDefinition<unknown>> = {
  snake,
  "2048": game2048,
  tetris,
};

export type { GameAction, GameDefinition } from "./types";
