import { LogColor, RainbowPosition } from "./interfaces";

// `| lolcat` (TASK-99): the colors of the rainbow from the ANSI palette of the theme, so it reads
// on any background
export const RAINBOW_COLORS: LogColor[] = [
  "ansi-red",
  "ansi-yellow",
  "ansi-green",
  "ansi-cyan",
  "ansi-blue",
  "ansi-magenta",
];
// how many columns one color takes
const BAND_WIDTH = 2;

// the color of a character: diagonal stripes, as lolcat draws them
export const getRainbowColor = ({ row, col }: RainbowPosition) =>
  RAINBOW_COLORS[Math.floor((row + col) / BAND_WIDTH) % RAINBOW_COLORS.length];

export interface RainbowRun {
  text: string;
  color: LogColor;
}

// the text cut into runs of one color, starting at `start`; `end` is where the next text goes on.
// "\n" moves to the next line, to its column `left`
export const getRainbowRuns = (text: string, start: RainbowPosition, left = 0) => {
  const runs: RainbowRun[] = [];
  let { row, col } = start;
  for (const char of text) {
    const last = runs.at(-1);
    // a line break has no color: it goes on with its line
    const color = char === "\n" && last ? last.color : getRainbowColor({ row, col });
    if (last && last.color === color) last.text += char;
    else runs.push({ text: char, color });
    if (char === "\n") {
      row += 1;
      col = left;
    } else {
      col += 1;
    }
  }
  return { runs, end: { row, col } };
};
