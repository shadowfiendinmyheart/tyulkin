import { GameAction, GameDefinition, Point, Random, randomItem } from "./types";

export const GRID_SIZE = 4;
// the chance of a new tile to be 4, not 2
const FOUR_CHANCE = 0.1;
const START_TILES = 2;
// a cell fits up to 131072 with a space on both sides
const CELL_WIDTH = 8;

// rows of tile values, 0 is an empty cell
export type Grid = number[][];

export interface Game2048State {
  grid: Grid;
  score: number;
  over: boolean;
}

const emptyCells = (grid: Grid): Point[] =>
  grid.flatMap((row, y) => row.flatMap((value, x) => (value ? [] : [{ x, y }])));

const addTile = (grid: Grid, random: Random): Grid => {
  const cells = emptyCells(grid);
  if (!cells.length) return grid;
  const cell = randomItem(cells, random);
  const value = random() < FOUR_CHANCE ? 4 : 2;
  return grid.map((row, y) => row.map((tile, x) => (x === cell.x && y === cell.y ? value : tile)));
};

// slides a line towards its start, every tile merged at most once: [2, 2, 2, 2] -> [4, 4, 0, 0]
export const slideLine = (line: number[]): { line: number[]; gained: number } => {
  const tiles = line.filter(Boolean);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      merged.push(tiles[i] * 2);
      gained += tiles[i] * 2;
      i++;
    } else {
      merged.push(tiles[i]);
    }
  }
  return { line: [...merged, ...Array<number>(line.length - merged.length).fill(0)], gained };
};

const transpose = (grid: Grid): Grid => grid[0].map((_, x) => grid.map((row) => row[x]));
const reverseRows = (grid: Grid): Grid => grid.map((row) => [...row].reverse());

type Turn = { to: (grid: Grid) => Grid; back: (grid: Grid) => Grid };

// every move is a slide to the left of a turned grid, turned back after
const turns: Record<Exclude<GameAction, "drop">, Turn> = {
  left: { to: (grid) => grid, back: (grid) => grid },
  right: { to: reverseRows, back: reverseRows },
  up: { to: transpose, back: transpose },
  down: {
    to: (grid) => reverseRows(transpose(grid)),
    back: (grid) => transpose(reverseRows(grid)),
  },
};

export const moveGrid = (grid: Grid, action: GameAction): { grid: Grid; gained: number } => {
  if (action === "drop") return { grid, gained: 0 };
  const { to, back } = turns[action];
  let gained = 0;
  const slid = to(grid).map((row) => {
    const result = slideLine(row);
    gained += result.gained;
    return result.line;
  });
  return { grid: back(slid), gained };
};

const sameGrid = (a: Grid, b: Grid) =>
  a.every((row, y) => row.every((value, x) => value === b[y][x]));

export const canMove = (grid: Grid) =>
  emptyCells(grid).length > 0 ||
  grid.some((row, y) => row.some((value, x) => value === row[x + 1] || value === grid[y + 1]?.[x]));

export const game2048: GameDefinition<Game2048State> = {
  create: (random) => {
    let grid: Grid = Array.from({ length: GRID_SIZE }, () => Array<number>(GRID_SIZE).fill(0));
    for (let i = 0; i < START_TILES; i++) grid = addTile(grid, random);
    return { grid, score: 0, over: false };
  },

  act: (state, action, random) => {
    if (state.over) return state;
    const moved = moveGrid(state.grid, action);
    if (sameGrid(moved.grid, state.grid)) return state;
    const grid = addTile(moved.grid, random);
    return { grid, score: state.score + moved.gained, over: !canMove(grid) };
  },

  render: ({ grid }) => {
    const border = `+${Array(GRID_SIZE).fill("-".repeat(CELL_WIDTH)).join("+")}+`;
    const empty = `|${Array(GRID_SIZE).fill(" ".repeat(CELL_WIDTH)).join("|")}|`;
    // a tile is three lines high, the value in the middle one: the cells come out about square
    return [
      border,
      ...grid.flatMap((row) => [
        empty,
        `|${row.map((value) => `${value || ""} `.padStart(CELL_WIDTH)).join("|")}|`,
        empty,
        border,
      ]),
    ];
  },

  score: ({ score }) => score,
  isOver: ({ over }) => over,
  hintKey: "gameHintMove",
  swipeDown: "down",
};
