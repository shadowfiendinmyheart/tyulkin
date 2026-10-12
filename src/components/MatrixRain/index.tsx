import React from "react";
import { useT } from "../../context/localizationContext";
import { prefersReducedMotion } from "../../utils";

import styles from "./styles.module.scss";

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

// colors of the current theme, see styles/themes.scss
const readThemeColors = () => {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return { bg: read("--bg-color"), trail: read("--text-color"), head: read("--accent-color") };
};

// keeps the browser's own keys (reload, DevTools, back, fullscreen) working while the rain is shown
const isBrowserShortcut = (e: KeyboardEvent) =>
  e.ctrlKey || e.metaKey || e.altKey || /^Fd{1,2}$/.test(e.key);

interface MatrixRainProps {
  onExit: () => void;
}

// the `matrix` digital rain over the whole page, in the colors of the theme;
// any key or tap closes it and goes no further (doesn't type or press anything beneath)
const MatrixRain: React.FC<MatrixRainProps> = ({ onExit }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const t = useT();
  const onExitRef = React.useRef(onExit);
  React.useLayoutEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  React.useEffect(() => {
    const exit = (e: KeyboardEvent | MouseEvent) => {
      e.stopPropagation();
      if (!(e instanceof KeyboardEvent && isBrowserShortcut(e))) e.preventDefault();
      // a held Enter that ran `matrix` must not close it at once
      if (e instanceof KeyboardEvent && e.repeat) return;
      onExitRef.current();
    };
    // capture on window: before the console's own listeners on document and the input
    window.addEventListener("keydown", exit, true);
    window.addEventListener("click", exit, true);
    return () => {
      window.removeEventListener("keydown", exit, true);
      window.removeEventListener("click", exit, true);
    };
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const colors = readThemeColors();
    const font = `${CELL_PX}px ${getComputedStyle(document.body).fontFamily || "monospace"}`;
    let width = 0;
    let height = 0;
    // row of the head of the drop in each column; negative — not yet on the screen
    let drops: number[] = [];

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      // resizing resets the context
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.font = font;
      ctx.textBaseline = "top";
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
      const rows = Math.ceil(height / CELL_PX);
      drops = Array.from({ length: Math.ceil(width / CELL_PX) }, () =>
        Math.floor(Math.random() * -rows),
      );
    };

    const drawFrame = () => {
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
          ctx.fillStyle = colors.trail;
          ctx.fillText(randomGlyph(), x, (row - 1) * CELL_PX);
        }
        if (row >= 0) {
          ctx.fillStyle = colors.head;
          ctx.fillText(randomGlyph(), x, row * CELL_PX);
        }
        drops[column] = row + 1;
      });
    };

    if (prefersReducedMotion()) {
      const drawStill = () => {
        resize();
        const frames = STILL_SCREENS * Math.ceil(height / CELL_PX);
        for (let frame = 0; frame < frames; frame++) drawFrame();
      };
      drawStill();
      window.addEventListener("resize", drawStill);
      return () => window.removeEventListener("resize", drawStill);
    }

    resize();
    window.addEventListener("resize", resize);
    let frameId = 0;
    let lastFrameTime = 0;
    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      if (time - lastFrameTime < FRAME_MS) return;
      lastFrameTime = time;
      drawFrame();
    };
    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={styles.matrix}>
      <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
      <p className={styles.hint} role="status">
        {t({ key: "matrixExit" })}
      </p>
    </div>
  );
};

export default MatrixRain;
