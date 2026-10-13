import { GameDefinition, Random, randomItem } from "./types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
// the score of 1–4 lines cleared at once, times the level + 1
const LINE_SCORES = [0, 100, 300, 500, 800];
// a cell passed by a hard drop
const DROP_SCORE = 2;
const LINES_PER_LEVEL = 10;
const START_FALL_MS = 800;
const MIN_FALL_MS = 100;
const FALL_SPEEDUP_MS = 70;
// a rotation blocked by a wall or a block tries these shifts to the side
const KICKS = [0, -1, 1, -2, 2];

// square matrices of 0 and 1, rotated around their center
export type Shape = number[][];

const SHAPES: Shape[] = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // O
  [
    [1, 1],
    [1, 1],
  ],
  // T
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // S
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  // Z
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  // J
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // L
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
];

// rows of cells, true is a fixed block
export type Board = boolean[][];

export interface Piece {
  shape: Shape;
  // the top left corner of the shape on the board
  x: number;
  y: number;
}

export interface TetrisState {
  board: Board;
  piece: Piece;
  next: Shape;
  score: number;
  lines: number;
  over: boolean;
}

export const rotate = (shape: Shape): Shape =>
  shape[0].map((_, x) => shape.map((row) => row[x]).reverse());

export const emptyBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array<boolean>(BOARD_WIDTH).fill(false));

const spawn = (shape: Shape): Piece => ({
  shape,
  x: Math.floor((BOARD_WIDTH - shape.length) / 2),
  y: 0,
});

// a piece collides with the board's edges and the blocks on it
export const collides = (board: Board, { shape, x, y }: Piece) =>
  shape.some((row, dy) =>
    row.some((cell, dx) => {
      if (!cell) return false;
      const bx = x + dx;
      const by = y + dy;
      return bx < 0 || bx >= BOARD_WIDTH || by < 0 || by >= BOARD_HEIGHT || board[by][bx];
    }),
  );

const level = (lines: number) => Math.floor(lines / LINES_PER_LEVEL);

// fixes the piece on the board, clears the full lines and brings the next piece
const lock = (state: TetrisState, random: Random): TetrisState => {
  const { piece } = state;
  const board = state.board.map((row) => [...row]);
  piece.shape.forEach((row, dy) =>
    row.forEach((cell, dx) => {
      if (cell) board[piece.y + dy][piece.x + dx] = true;
    }),
  );
  const kept = board.filter((row) => !row.every(Boolean));
  const cleared = BOARD_HEIGHT - kept.length;
  const newRows = Array.from({ length: cleared }, () => Array<boolean>(BOARD_WIDTH).fill(false));
  const nextBoard = [...newRows, ...kept];
  const nextPiece = spawn(state.next);
  return {
    board: nextBoard,
    piece: nextPiece,
    next: randomItem(SHAPES, random),
    score: state.score + LINE_SCORES[cleared] * (level(state.lines) + 1),
    lines: state.lines + cleared,
    // no room for the next piece: the stack has topped out
    over: collides(nextBoard, nextPiece),
  };
};

const moved = (state: TetrisState, dx: number, dy: number): TetrisState | undefined => {
  const piece = { ...state.piece, x: state.piece.x + dx, y: state.piece.y + dy };
  return collides(state.board, piece) ? undefined : { ...state, piece };
};

const fall = (state: TetrisState, random: Random) => moved(state, 0, 1) ?? lock(state, random);

export const tetris: GameDefinition<TetrisState> = {
  create: (random) => ({
    board: emptyBoard(),
    piece: spawn(randomItem(SHAPES, random)),
    next: randomItem(SHAPES, random),
    score: 0,
    lines: 0,
    over: false,
  }),

  tickMs: ({ lines }) => Math.max(MIN_FALL_MS, START_FALL_MS - level(lines) * FALL_SPEEDUP_MS),

  tick: (state, random) => (state.over ? state : fall(state, random)),

  act: (state, action, random) => {
    if (state.over) return state;
    switch (action) {
      case "left":
        return moved(state, -1, 0) ?? state;
      case "right":
        return moved(state, 1, 0) ?? state;
      case "down":
        return fall(state, random);
      case "up": {
        const shape = rotate(state.piece.shape);
        for (const kick of KICKS) {
          const piece = { ...state.piece, shape, x: state.piece.x + kick };
          if (!collides(state.board, piece)) return { ...state, piece };
        }
        return state;
      }
      case "drop": {
        let dropped = state;
        let rows = 0;
        for (let next = moved(state, 0, 1); next; next = moved(dropped, 0, 1)) {
          dropped = next;
          rows++;
        }
        return lock({ ...dropped, score: dropped.score + rows * DROP_SCORE }, random);
      }
    }
  },

  // the board of the Electronika 60 original: "[]" a block, " ." an empty cell, the next piece aside
  render: ({ board, piece, next }) => {
    const cells = board.map((row) => row.map((cell) => (cell ? "[]" : " .")));
    piece.shape.forEach((row, dy) =>
      row.forEach((cell, dx) => {
        if (cell) cells[piece.y + dy][piece.x + dx] = "[]";
      }),
    );
    const preview = ["", ...next.map((row) => row.map((cell) => (cell ? "[]" : "  ")).join(""))];
    const sideWidth = 2 + 4 * 2;
    const side = (y: number) => `  ${preview[y] ?? ""}`.padEnd(sideWidth);
    return [
      ...cells.map((row, y) => `<!${row.join("")}!>${side(y)}`),
      `<!${"=".repeat(BOARD_WIDTH * 2)}!>${side(BOARD_HEIGHT)}`,
      `  ${"\\/".repeat(BOARD_WIDTH)}  ${side(BOARD_HEIGHT + 1)}`,
    ];
  },

  score: ({ score }) => score,
  isOver: ({ over }) => over,
  hintKey: "gameHintTetris",
  // the thumb drops, a tap rotates
  swipeDown: "drop",
  tap: "up",
};
