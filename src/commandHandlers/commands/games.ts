import { GameId, gameIds } from "../../domain";
import { CommandDescriptionKeys } from "../../localization/interfaces";
import { setGame } from "../../store/console/actions";
import { Command } from "../interfaces";

const descriptionKeys: Record<GameId, CommandDescriptionKeys> = {
  snake: "helpSnake",
  "2048": "helpGame2048",
  tetris: "helpTetris",
};

// the mini-games over the console (TASK-66); the game itself is loaded on the first run
export const gameCommands: Command[] = gameIds.map((game) => ({
  name: game,
  descriptionKey: descriptionKeys[game],
  // a link would start a game on the recipient's page at once
  shareable: false,
  linkable: false,
  // the game may fail to load after the command is over: its block is marked then (TASK-101)
  run: ({ consoleDispatch, blockId, fail }) =>
    consoleDispatch(setGame({ id: game, blockId, fail })),
}));
