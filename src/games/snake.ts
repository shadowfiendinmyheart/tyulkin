import { GameAction, GameDefinition, Point, Random, randomItem } from "./types";

export const SNAKE_WIDTH = 16;
export const SNAKE_HEIGHT = 12;
const START_LENGTH = 3;
// a turn pressed faster than the snake moves waits for its step: two in a row make a U-turn
const MAX_QUEUED_TURNS = 2;
const START_STEP_MS = 160;
const MIN_STEP_MS = 70;
// faster with every eaten piece
const STEP_SPEEDUP_MS = 3;

type Direction = Exclude<GameAction, "drop">;

const shifts: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const opposite: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export interface SnakeState {
  // the head first
  snake: Point[];
  direction: Direction;
  turns: Direction[];
  // null: the snake fills the whole field
  food: Point | null;
  score: number;
  over: boolean;
}

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

const placeFood = (body: Point[], random: Random): Point | null => {
  const free: Point[] = [];
  for (let y = 0; y < SNAKE_HEIGHT; y++) {
    for (let x = 0; x < SNAKE_WIDTH; x++) {
      if (!body.some((part) => part.x === x && part.y === y)) free.push({ x, y });
    }
  }
  return free.length ? randomItem(free, random) : null;
};

export const snake: GameDefinition<SnakeState> = {
  create: (random) => {
    const y = Math.floor(SNAKE_HEIGHT / 2);
    const head = Math.floor(SNAKE_WIDTH / 2);
    const body = Array.from({ length: START_LENGTH }, (_, i) => ({ x: head - i, y }));
    return {
      snake: body,
      direction: "right",
      turns: [],
      food: placeFood(body, random),
      score: 0,
      over: false,
    };
  },

  tickMs: ({ score }) => Math.max(MIN_STEP_MS, START_STEP_MS - score * STEP_SPEEDUP_MS),

  tick: (state, random) => {
    if (state.over) return state;
    const [turn, ...turns] = state.turns;
    const direction = turn ?? state.direction;
    const shift = shifts[direction];
    const head = { x: state.snake[0].x + shift.x, y: state.snake[0].y + shift.y };
    const eats = state.food !== null && samePoint(head, state.food);
    // the tail moves away in the same step, unless the snake grows
    const body = eats ? state.snake : state.snake.slice(0, -1);
    const hitsWall = head.x < 0 || head.y < 0 || head.x >= SNAKE_WIDTH || head.y >= SNAKE_HEIGHT;
    if (hitsWall || body.some((part) => samePoint(part, head))) {
      return { ...state, direction, turns, over: true };
    }
    const moved = [head, ...body];
    if (!eats) return { ...state, snake: moved, direction, turns };
    const food = placeFood(moved, random);
    return { ...state, snake: moved, direction, turns, food, score: state.score + 1, over: !food };
  },

  act: (state, action) => {
    if (state.over || action === "drop") return state;
    const last = state.turns.at(-1) ?? state.direction;
    if (action === last || action === opposite[last] || state.turns.length >= MAX_QUEUED_TURNS) {
      return state;
    }
    return { ...state, turns: [...state.turns, action] };
  },

  // two characters a cell: a monospace character is about twice as high as wide
  render: ({ snake: body, food }) => {
    const border = `+${"-".repeat(SNAKE_WIDTH * 2)}+`;
    const rows = Array.from({ length: SNAKE_HEIGHT }, (_, y) => {
      const cells = Array.from({ length: SNAKE_WIDTH }, (_, x) => {
        const point = { x, y };
        if (samePoint(body[0], point)) return "@@";
        if (body.some((part) => samePoint(part, point))) return "[]";
        if (food && samePoint(food, point)) return "()";
        return " .";
      });
      return `|${cells.join("")}|`;
    });
    return [border, ...rows, border];
  },

  score: ({ score }) => score,
  isOver: ({ over }) => over,
  hintKey: "gameHintMove",
  swipeDown: "down",
};
