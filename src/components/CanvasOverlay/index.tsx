import React from "react";
import { AnsiColor } from "../../domain";
import { useT } from "../../context/localizationContext";
import { isBrowserShortcut, prefersReducedMotion } from "../../utils";

import styles from "./styles.module.scss";

// the chromatic ANSI colors of the theme: each passes WCAG AA against its background
const PALETTE_COLORS: AnsiColor[] = ["red", "green", "yellow", "blue", "magenta", "cyan"];

export interface ThemeColors {
  bg: string;
  text: string;
  accent: string;
  // the chromatic ANSI colors
  palette: string[];
}

// colors of the current theme, see styles/themes.scss
const readThemeColors = (): ThemeColors => {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    bg: read("--bg-color"),
    text: read("--text-color"),
    accent: read("--accent-color"),
    palette: PALETTE_COLORS.map((color) => read(`--ansi-${color}`)),
  };
};

// what a scene draws with; the context is cleared with colors.bg before each resize
export interface SceneContext {
  ctx: CanvasRenderingContext2D;
  colors: ThemeColors;
  // of the page: the font set by `set font`
  fontFamily: string;
}

// an animation over the whole page: the `matrix` rain, a screensaver
export interface Scene {
  // the time between frames
  frameMs: number;
  // the canvas got this size in css px and was cleared: the scene starts over
  resize: (width: number, height: number) => void;
  drawFrame: () => void;
  // with reduced motion a single still picture is drawn: this many frames at once after a resize
  stillFrames: (width: number, height: number) => number;
}

export type CreateScene = (context: SceneContext) => Scene;

interface CanvasOverlayProps {
  createScene: CreateScene;
  onExit: () => void;
}

// a canvas over the whole page, in the colors of the theme; any key or tap closes it and goes no
// further (doesn't type or press anything beneath)
const CanvasOverlay: React.FC<CanvasOverlayProps> = ({ createScene, onExit }) => {
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
      // a held Enter that ran the command must not close it at once
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
    const fontFamily = getComputedStyle(document.body).fontFamily || "monospace";
    const scene = createScene({ ctx, colors, fontFamily });
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      // resizing resets the context
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.textBaseline = "top";
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
      scene.resize(width, height);
    };

    if (prefersReducedMotion()) {
      const drawStill = () => {
        resize();
        const frames = scene.stillFrames(width, height);
        for (let frame = 0; frame < frames; frame++) scene.drawFrame();
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
      if (time - lastFrameTime < scene.frameMs) return;
      lastFrameTime = time;
      scene.drawFrame();
    };
    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [createScene]);

  return (
    <div className={styles.overlay}>
      <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
      <p className={styles.hint} role="status">
        {t({ key: "overlayExit" })}
      </p>
    </div>
  );
};

export default CanvasOverlay;
