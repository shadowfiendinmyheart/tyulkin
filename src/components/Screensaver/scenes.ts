import { ScreensaverId } from "../../domain";
import logo from "../../commandHandlers/neofetchLogo.json";
import { randomItem as randomItemOf } from "../../games/types";
import { CreateScene } from "../CanvasOverlay";

const randomInt = (max: number) => Math.floor(Math.random() * max);
const randomItem = <T>(items: readonly T[]) => randomItemOf(items, Math.random);

// --- pipes: a pipe crawls over a grid, turning at random; the screen fills, clears, starts over
const PIPE_CELL_PX = 24;
const PIPE_WIDTH_PX = 8;
const PIPE_FRAME_MS = 40;
const PIPE_TURN_CHANCE = 0.2;
// a pipe ends after this many cells (or at an edge), the next one starts elsewhere in a new color
const PIPE_MIN_LENGTH = 30;
const PIPE_MAX_LENGTH = 120;
// the screen is cleared when the pipes have taken this many cells per cell of the grid
const PIPES_PER_CELL = 0.8;
// with reduced motion: the still picture of the pipes drawn by so many steps per cell of the grid
const PIPES_STILL_PER_CELL = 0.4;

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;

const createPipesScene: CreateScene = ({ ctx, colors }) => {
  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let steps = 0;
  let pipe = { column: 0, row: 0, direction: 0, length: 0, color: "" };

  const center = (cell: number) => cell * PIPE_CELL_PX + PIPE_CELL_PX / 2;
  const startPipe = () => {
    pipe = {
      column: randomInt(columns),
      row: randomInt(rows),
      direction: randomInt(DIRECTIONS.length),
      length: PIPE_MIN_LENGTH + randomInt(PIPE_MAX_LENGTH - PIPE_MIN_LENGTH),
      color: randomItem(colors.palette),
    };
  };

  return {
    frameMs: PIPE_FRAME_MS,
    stillFrames: () => Math.ceil(columns * rows * PIPES_STILL_PER_CELL),
    resize: (newWidth, newHeight) => {
      width = newWidth;
      height = newHeight;
      columns = Math.max(1, Math.floor(width / PIPE_CELL_PX));
      rows = Math.max(1, Math.floor(height / PIPE_CELL_PX));
      steps = 0;
      ctx.lineWidth = PIPE_WIDTH_PX;
      ctx.lineCap = "round";
      startPipe();
    },
    drawFrame: () => {
      if (steps >= columns * rows * PIPES_PER_CELL) {
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);
        steps = 0;
      }
      if (Math.random() < PIPE_TURN_CHANCE) {
        // a quarter turn left or right, never back
        pipe.direction = (pipe.direction + (Math.random() < 0.5 ? 1 : 3)) % DIRECTIONS.length;
      }
      const [dx, dy] = DIRECTIONS[pipe.direction];
      const column = pipe.column + dx;
      const row = pipe.row + dy;
      if (pipe.length <= 0 || column < 0 || row < 0 || column >= columns || row >= rows) {
        startPipe();
        return;
      }
      ctx.strokeStyle = pipe.color;
      ctx.beginPath();
      ctx.moveTo(center(pipe.column), center(pipe.row));
      ctx.lineTo(center(column), center(row));
      ctx.stroke();
      pipe = { ...pipe, column, row, length: pipe.length - 1 };
      steps++;
    },
  };
};

// --- stars: flying through a starfield, the stars come from the center and speed past the edges
const STARS_COUNT = 300;
const STARS_FRAME_MS = 30;
// how much nearer a star comes per frame, of the farthest distance
const STAR_SPEED = 0.01;
const STAR_MAX_SIZE_PX = 3;

const createStarsScene: CreateScene = ({ ctx, colors }) => {
  let width = 0;
  let height = 0;
  // x, y within -1..1 of the half-screen at the distance 1; z: the distance, 0..1
  const newStar = (z = Math.random()) => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z,
  });
  const stars = Array.from({ length: STARS_COUNT }, () => newStar());

  return {
    frameMs: STARS_FRAME_MS,
    stillFrames: () => 1,
    resize: (newWidth, newHeight) => {
      width = newWidth;
      height = newHeight;
    },
    drawFrame: () => {
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = colors.text;
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      // changed in place: the scene may run for hours, new objects every frame are garbage
      stars.forEach((star) => {
        star.z -= STAR_SPEED;
        const x = halfWidth + (star.x / star.z) * halfWidth;
        const y = halfHeight + (star.y / star.z) * halfHeight;
        // gone past the screen: a new one far away
        if (star.z <= 0 || x < 0 || y < 0 || x > width || y > height) {
          Object.assign(star, newStar(1));
          return;
        }
        // the nearer, the bigger and the brighter
        const nearness = 1 - star.z;
        const size = Math.max(1, nearness * STAR_MAX_SIZE_PX);
        ctx.globalAlpha = nearness;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      });
      ctx.globalAlpha = 1;
    },
  };
};

// --- logo: the logo of neofetch bounces off the edges, as a DVD player's, a new color each time
const LOGO_FONT_PX = 20;
const LOGO_LINE_PX = 24;
const LOGO_FRAME_MS = 30;
const LOGO_SPEED_PX = 2;

const createLogoScene: CreateScene = ({ ctx, colors, fontFamily }) => {
  let width = 0;
  let height = 0;
  let logoWidth = 0;
  const logoHeight = logo.length * LOGO_LINE_PX;
  let x = 0;
  let y = 0;
  let dx = LOGO_SPEED_PX;
  let dy = LOGO_SPEED_PX;
  let color = randomItem(colors.palette);
  // measured again each frame: a font of `set font` may finish loading while the logo bounces
  const measureLogo = () => Math.max(...logo.map((line) => ctx.measureText(line).width));
  // the next position on an axis: off an edge it turns back inside; a logo that doesn't fit on
  // the axis stays at its start (no bounce, no color change every frame)
  const move = (position: number, speed: number, size: number, screen: number) => {
    const max = screen - size;
    if (max <= 0) return { position: 0, speed, bounced: false };
    const next = position + speed;
    if (next <= 0) return { position: 0, speed: LOGO_SPEED_PX, bounced: true };
    if (next >= max) return { position: max, speed: -LOGO_SPEED_PX, bounced: true };
    return { position: next, speed, bounced: false };
  };
  const changeColor = () => {
    const others = colors.palette.filter((other) => other !== color);
    color = randomItem(others.length ? others : colors.palette);
  };

  return {
    frameMs: LOGO_FRAME_MS,
    stillFrames: () => 1,
    resize: (newWidth, newHeight) => {
      width = newWidth;
      height = newHeight;
      ctx.font = `bold ${LOGO_FONT_PX}px ${fontFamily}`;
      logoWidth = measureLogo();
      x = Math.random() * Math.max(0, width - logoWidth);
      y = Math.random() * Math.max(0, height - logoHeight);
    },
    drawFrame: () => {
      logoWidth = measureLogo();
      const horizontal = move(x, dx, logoWidth, width);
      const vertical = move(y, dy, logoHeight, height);
      ({ position: x, speed: dx } = horizontal);
      ({ position: y, speed: dy } = vertical);
      // off an edge, or two at a corner: a single new color
      if (horizontal.bounced || vertical.bounced) changeColor();
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = color;
      logo.forEach((line, index) => ctx.fillText(line, x, y + index * LOGO_LINE_PX));
    },
  };
};

export const screensaverScenes: Record<ScreensaverId, CreateScene> = {
  pipes: createPipesScene,
  stars: createStarsScene,
  logo: createLogoScene,
};
