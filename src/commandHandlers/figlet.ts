// `figlet` (TASK-99): big letters of "#", five lines high. Only "#" and spaces: the block characters
// are not in the terminal font, a fallback font would draw them out of the columns

// a glyph is its five lines; they are padded to the widest one
const FONT: Record<string, string[]> = {
  A: [" ### ", "#   #", "#####", "#   #", "#   #"],
  B: ["#### ", "#   #", "#### ", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#### ", "#    ", "#####"],
  F: ["#####", "#    ", "#### ", "#    ", "#    "],
  G: [" ####", "#    ", "#  ##", "#   #", " ####"],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  I: ["###", " # ", " # ", " # ", "###"],
  J: ["  ###", "    #", "    #", "#   #", " ### "],
  K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#### ", "#    ", "#    "],
  Q: [" ### ", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "# # #", "## ##", "#   #"],
  X: ["#   #", " # # ", "  #  ", " # # ", "#   #"],
  Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "   # ", "  #  ", " #   ", "#####"],
  Б: ["#####", "#    ", "#### ", "#   #", "#### "],
  Г: ["#####", "#    ", "#    ", "#    ", "#    "],
  Д: [" ### ", " #  #", " #  #", "#####", "#   #"],
  Ж: ["# # #", "# # #", " ### ", "# # #", "# # #"],
  И: ["#   #", "#  ##", "# # #", "##  #", "#   #"],
  Й: ["# # #", "#  ##", "# # #", "##  #", "#   #"],
  Л: ["  ###", " #  #", " #  #", " #  #", "#   #"],
  П: ["#####", "#   #", "#   #", "#   #", "#   #"],
  У: ["#   #", "#   #", " ####", "    #", " ### "],
  Ф: [" ### ", "# # #", "# # #", " ### ", "  #  "],
  Ц: ["#  # ", "#  # ", "#  # ", "#####", "    #"],
  Ч: ["#   #", "#   #", " ####", "    #", "    #"],
  Ш: ["# # #", "# # #", "# # #", "# # #", "#####"],
  Щ: ["# # # ", "# # # ", "# # # ", "######", "     #"],
  Ъ: ["##   ", " #   ", " ### ", " #  #", " ### "],
  Ы: ["#    #", "#    #", "###  #", "#  # #", "###  #"],
  Ь: ["#    ", "#    ", "#### ", "#   #", "#### "],
  Э: ["#### ", "    #", "  ###", "    #", "#### "],
  Ю: ["#  ## ", "# #  #", "###  #", "# #  #", "#  ## "],
  Я: [" ####", "#   #", " ####", "  # #", "#   #"],
  "0": [" ### ", "#  ##", "# # #", "##  #", " ### "],
  "1": [" # ", "## ", " # ", " # ", "###"],
  "2": [" ### ", "#   #", "  ## ", " #   ", "#####"],
  "3": ["#### ", "    #", " ### ", "    #", "#### "],
  "4": ["#   #", "#   #", "#####", "    #", "    #"],
  "5": ["#####", "#    ", "#### ", "    #", "#### "],
  "6": [" ### ", "#    ", "#### ", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", "  #  "],
  "8": [" ### ", "#   #", " ### ", "#   #", " ### "],
  "9": [" ### ", "#   #", " ####", "    #", " ### "],
  " ": ["  ", "  ", "  ", "  ", "  "],
  "!": ["#", "#", "#", " ", "#"],
  "?": [" ### ", "#   #", "  ## ", "     ", "  #  "],
  ".": [" ", " ", " ", " ", "#"],
  ",": ["  ", "  ", "  ", " #", "# "],
  ":": [" ", "#", " ", "#", " "],
  ";": ["  ", " #", "  ", " #", "# "],
  "'": ["#", "#", " ", " ", " "],
  '"': ["# #", "# #", "   ", "   ", "   "],
  "-": ["    ", "    ", "####", "    ", "    "],
  _: ["    ", "    ", "    ", "    ", "####"],
  "+": ["     ", "  #  ", "#####", "  #  ", "     "],
  "=": ["    ", "####", "    ", "####", "    "],
  "*": ["     ", "# # #", " ### ", "# # #", "     "],
  "/": ["    #", "   # ", "  #  ", " #   ", "#    "],
  "\\": ["#    ", " #   ", "  #  ", "   # ", "    #"],
  "(": [" #", "# ", "# ", "# ", " #"],
  ")": ["# ", " #", " #", " #", "# "],
  "<": ["  #", " # ", "#  ", " # ", "  #"],
  ">": ["#  ", " # ", "  #", " # ", "#  "],
  "@": [" ### ", "#   #", "# ###", "#    ", " ####"],
  "#": [" # # ", "#####", " # # ", "#####", " # # "],
  $: [" ####", "# #  ", " ### ", "  # #", "#### "],
  "%": ["##  #", "## # ", "  #  ", " # ##", "#  ##"],
  "&": [" ##  ", "#  # ", " ## #", "#  # ", " ## #"],
  "^": ["  #  ", " # # ", "#   #", "     ", "     "],
};
// letters of the same shape
const ALIASES: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  Ё: "E",
  З: "3",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  Х: "X",
};
// a character without a glyph
const UNKNOWN = "?";

export const FIGLET_HEIGHT = 5;
// the width of a line of art, as figlet wraps by default
export const FIGLET_WIDTH = 80;

// the glyphs padded once
const GLYPHS = new Map(
  Object.entries(FONT).map(([char, lines]) => {
    const width = Math.max(...lines.map((line) => line.length));
    return [char, lines.map((line) => line.padEnd(width))];
  }),
);

const getGlyph = (char: string) => {
  const upper = char.toUpperCase();
  return GLYPHS.get(ALIASES[upper] ?? upper) ?? (GLYPHS.get(UNKNOWN) as string[]);
};

const getGlyphWidth = (char: string) => getGlyph(char)[0].length;

// the columns of a text in art: its glyphs a column apart
const getTextWidth = (text: string) =>
  Array.from(text).reduce((sum, char) => sum + getGlyphWidth(char) + 1, -1);

// one line of art
const drawLine = (text: string) => {
  const glyphs = Array.from(text, getGlyph);
  return Array.from({ length: FIGLET_HEIGHT }, (_, row) =>
    glyphs
      .map((glyph) => glyph[row])
      .join(" ")
      .trimEnd(),
  ).join("\n");
};

// the text in lines of art that fit FIGLET_WIDTH: by words, a word longer than a line is broken
const wrapText = (text: string) => {
  const lines: string[] = [];
  let line = "";
  let width = 0;
  const append = (part: string, partWidth: number) => {
    width += (line ? 1 : 0) + partWidth;
    line += part;
  };
  const endLine = () => {
    if (line) lines.push(line);
    line = "";
    width = 0;
  };
  const spaceWidth = getGlyphWidth(" ") + 1;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const wordWidth = getTextWidth(word);
    if (line && width + 1 + spaceWidth + wordWidth <= FIGLET_WIDTH) {
      append(` ${word}`, spaceWidth + wordWidth);
      continue;
    }
    endLine();
    if (wordWidth <= FIGLET_WIDTH) {
      append(word, wordWidth);
      continue;
    }
    for (const char of word) {
      const charWidth = getGlyphWidth(char);
      if (line && width + 1 + charWidth > FIGLET_WIDTH) endLine();
      append(char, charWidth);
    }
  }
  endLine();
  return lines;
};

// the text in big letters; lines of art are an empty line apart
export const drawFiglet = (text: string) => wrapText(text).map(drawLine).join("\n\n");
