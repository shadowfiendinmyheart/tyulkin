import { describe, expect, it } from "vitest";
import { canMove, game2048, Game2048State, moveGrid, slideLine } from "./game2048";
import { snake, SNAKE_HEIGHT, SNAKE_WIDTH, SnakeState } from "./snake";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  collides,
  emptyBoard,
  rotate,
  tetris,
  TetrisState,
} from "./tetris";
import { games } from ".";

// the first item of any list (and a 4 for a new 2048 tile)
const first = () => 0;

describe.each(Object.entries(games))("%s", (_, game) => {
  it("renders lines of one length", () => {
    const lines = game.render(game.create(Math.random));
    expect(new Set(lines.map((line) => line.length)).size).toBe(1);
  });

  it("starts with no score", () => {
    const state = game.create(Math.random);
    expect(game.score(state)).toBe(0);
    expect(game.isOver(state)).toBe(false);
  });
});

describe("snake", () => {
  const start = snake.create(first);
  const step = (state: SnakeState, times = 1) => {
    for (let i = 0; i < times; i++) state = snake.tick!(state, first);
    return state;
  };

  it("moves right from the start, the food in the first free cell", () => {
    expect(start.snake).toHaveLength(3);
    expect(start.food).toEqual({ x: 0, y: 0 });
    const moved = step(start);
    expect(moved.snake[0]).toEqual({ x: start.snake[0].x + 1, y: start.snake[0].y });
    expect(moved.snake).toHaveLength(3);
  });

  it("ignores a turn back and keeps quick turns in order", () => {
    expect(snake.act(start, "left", first)).toBe(start);
    let state = snake.act(start, "up", first);
    state = snake.act(state, "left", first);
    expect(state.turns).toEqual(["up", "left"]);
    state = step(state, 2);
    expect(state.direction).toBe("left");
    expect(state.snake[0]).toEqual({ x: start.snake[0].x - 1, y: start.snake[0].y - 1 });
  });

  it("grows and scores on food", () => {
    const state: SnakeState = { ...start, food: { x: start.snake[0].x + 1, y: start.snake[0].y } };
    const fed = step(state);
    expect(fed.score).toBe(1);
    expect(fed.snake).toHaveLength(4);
    expect(fed.food).not.toEqual(fed.snake[0]);
  });

  it("is over at a wall", () => {
    const over = step(start, SNAKE_WIDTH);
    expect(snake.isOver(over)).toBe(true);
    expect(step(over)).toBe(over);
  });

  it("is over on itself, but may follow its own tail", () => {
    // a square of four: the head goes where the tail leaves
    const square: SnakeState = {
      ...start,
      snake: [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 1 },
      ],
      direction: "up",
      turns: ["right"],
      food: null,
    };
    expect(step(square).over).toBe(false);
    const five = { ...square, snake: [...square.snake, { x: 3, y: 1 }] };
    expect(step(five).over).toBe(true);
  });

  it("draws the head, the body and the food in two characters a cell", () => {
    const lines = snake.render(start);
    expect(lines).toHaveLength(SNAKE_HEIGHT + 2);
    expect(lines[1].startsWith("|()")).toBe(true);
    expect(lines[1 + start.snake[0].y]).toContain("[][]@@");
  });
});

describe("2048", () => {
  it("merges every tile once", () => {
    expect(slideLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], gained: 8 });
    expect(slideLine([0, 4, 4, 8])).toEqual({ line: [8, 8, 0, 0], gained: 8 });
    expect(slideLine([2, 0, 0, 2])).toEqual({ line: [4, 0, 0, 0], gained: 4 });
    expect(slideLine([2, 4, 8, 16])).toEqual({ line: [2, 4, 8, 16], gained: 0 });
  });

  it("moves in every direction", () => {
    const grid = [
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0],
    ];
    expect(moveGrid(grid, "left").grid[0]).toEqual([4, 0, 0, 0]);
    expect(moveGrid(grid, "right").grid[0]).toEqual([0, 0, 0, 4]);
    expect(moveGrid(grid, "up").grid.map((row) => row[0])).toEqual([4, 0, 0, 0]);
    expect(moveGrid(grid, "down").grid.map((row) => row[0])).toEqual([0, 0, 0, 4]);
  });

  it("adds a tile after a move only, and scores the merges", () => {
    const state: Game2048State = {
      grid: [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      score: 0,
      over: false,
    };
    expect(game2048.act(state, "up", first)).toBe(state);
    const moved = game2048.act(state, "left", first);
    expect(moved.score).toBe(4);
    expect(moved.grid[0]).toEqual([4, 4, 0, 0]);
  });

  it("is over when nothing can move", () => {
    const full = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(canMove(full)).toBe(false);
    expect(canMove([[2, 2, 4, 8], ...full.slice(1)])).toBe(true);
  });
});

describe("tetris", () => {
  // the first of the shapes is I, lying in the second row of its matrix
  const start = tetris.create(first);
  const withBoard = (rows: Record<number, number[]>): TetrisState => {
    const board = emptyBoard();
    Object.entries(rows).forEach(([y, xs]) => xs.forEach((x) => (board[Number(y)][x] = true)));
    return { ...start, board };
  };

  it("rotates a shape clockwise", () => {
    expect(
      rotate([
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ]),
    ).toEqual([
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ]);
  });

  it("stops at the walls", () => {
    let state = start;
    for (let i = 0; i < BOARD_WIDTH; i++) state = tetris.act(state, "left", first);
    expect(state.piece.x).toBe(0);
    expect(collides(state.board, { ...state.piece, x: -1 })).toBe(true);
  });

  it("drops, locks and clears a full line with the score of the level", () => {
    // the bottom row is full but for the four cells the I piece falls into
    const xs = Array.from({ length: BOARD_WIDTH }, (_, x) => x).filter(
      (x) => x < start.piece.x || x >= start.piece.x + 4,
    );
    const state = tetris.act(withBoard({ [BOARD_HEIGHT - 1]: xs }), "drop", first);
    expect(state.lines).toBe(1);
    expect(state.board.flat().some(Boolean)).toBe(false);
    // 100 for the line and 2 a row for the hard drop: the I piece passed BOARD_HEIGHT - 2 rows
    expect(state.score).toBe(100 + 2 * (BOARD_HEIGHT - 2));
    expect(state.piece.y).toBe(0);
  });

  it("is over when the next piece has no room", () => {
    const state = tetris.tick!(withBoard({ 2: [4] }), first);
    expect(state.over).toBe(true);
  });

  it("draws the next piece aside", () => {
    const lines = tetris.render(start);
    expect(lines).toHaveLength(BOARD_HEIGHT + 2);
    expect(lines[0].startsWith("<! . .")).toBe(true);
    expect(lines[2]).toContain("!>  [][][][]");
  });
});
