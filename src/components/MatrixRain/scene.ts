import { CreateScene } from "../CanvasOverlay";

// half-width katakana and digits, as in the film
const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
const CELL_PX = 16;
const FRAME_MS = 50;
// every frame covers the previous ones with a translucent background: the trail fades
const TRAIL_ALPHA = 0.08;
// chance per frame that a drop gone past the bottom starts again from the top
const RESTART_CHANCE = 0.025;
// with reduced motion a single still frame is drawn, as if the rain had fallen for this many
// screen heights: every drop, started up to a screen above, has had time to come down
const STILL_SCREENS = 2;

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

// the `matrix` digital rain (TASK-65), in the colors of the theme
export const createMatrixScene: CreateScene = ({ ctx, colors, fontFamily }) => {
  let width = 0;
  let height = 0;
  // row of the head of the drop in each column; negative — not yet on the screen
  let drops: number[] = [];

  return {
    frameMs: FRAME_MS,
    stillFrames: (_, height) => STILL_SCREENS * Math.ceil(height / CELL_PX),
    resize: (newWidth, newHeight) => {
      width = newWidth;
      height = newHeight;
      ctx.font = `${CELL_PX}px ${fontFamily}`;
      const rows = Math.ceil(height / CELL_PX);
      drops = Array.from({ length: Math.ceil(width / CELL_PX) }, () =>
        Math.floor(Math.random() * -rows),
      );
    },
    drawFrame: () => {
      ctx.globalAlpha = TRAIL_ALPHA;
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      drops.forEach((row, column) => {
        // gone past the bottom: waits for a restart, nothing to draw
        if (row * CELL_PX > height) {
          if (Math.random() < RESTART_CHANCE) drops[column] = 0;
          return;
        }
        const x = column * CELL_PX;
        if (row > 0) {
          // the previous head becomes a part of the trail
          ctx.fillStyle = colors.bg;
          ctx.fillRect(x, (row - 1) * CELL_PX, CELL_PX, CELL_PX);
          ctx.fillStyle = colors.text;
          ctx.fillText(randomGlyph(), x, (row - 1) * CELL_PX);
        }
        if (row >= 0) {
          ctx.fillStyle = colors.accent;
          ctx.fillText(randomGlyph(), x, row * CELL_PX);
        }
        drops[column] = row + 1;
      });
    },
  };
};
