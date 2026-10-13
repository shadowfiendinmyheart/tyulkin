// The link preview card (og:image): a 1200×630 PNG drawn at build time as the terminal with the
// `neofetch` output. Texts come from the English dictionary and the logo from the neofetch command,
// so the card follows the content. Rendered by resvg from an SVG with the site font.
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { Resvg } = require("@resvg/resvg-js");
const eng = require("../src/localization/dictionaries/eng.json");
const logo = require("../src/commandHandlers/neofetchLogo.json");

const WIDTH = 1200;
const HEIGHT = 630;
const FONT_FAMILY = "IBM Plex Mono";
const FONT_FILE =
  require.resolve("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff");
const FONT_SIZE = 32;
// IBM Plex Mono advance width is 600 units per em
const CHAR_WIDTH = FONT_SIZE * 0.6;
const LINE_HEIGHT = Math.round(FONT_SIZE * 1.4);
const PADDING = 56;
const TITLE_BAR_HEIGHT = 48;
// the default Black theme (src/styles/themes.scss)
const COLORS = {
  bg: "#000",
  text: "#ccc",
  muted: "#888",
  accent: "#5fafff",
  error: "#ff5f5f",
  caret: "#fff",
  frame: "#1a1a1a",
};
// the prompt of the main page (getPrompt in src/commandHandlers/shell.ts)
const PROMPT = "visitor@tyulkin:~$";

// resvg reads TrueType/OpenType only, @fontsource ships WOFF: unpack the zlib-compressed tables
// back into a plain sfnt (https://www.w3.org/TR/WOFF/)
const woffToSfnt = (woff) => {
  if (woff.toString("ascii", 0, 4) !== "wOFF") throw new Error("og-image: not a WOFF font");
  const numTables = woff.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    const offset = woff.readUInt32BE(entry + 4);
    const compLength = woff.readUInt32BE(entry + 8);
    const origLength = woff.readUInt32BE(entry + 12);
    const raw = woff.subarray(offset, offset + compLength);
    tables.push({
      tag: woff.subarray(entry, entry + 4),
      checksum: woff.readUInt32BE(entry + 16),
      data: compLength < origLength ? zlib.inflateSync(raw) : raw,
    });
  }
  const header = Buffer.alloc(12 + 16 * numTables);
  woff.copy(header, 0, 4, 8); // flavor = sfnt version
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 16 * 2 ** entrySelector;
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(searchRange, 6);
  header.writeUInt16BE(entrySelector, 8);
  header.writeUInt16BE(16 * numTables - searchRange, 10);
  const bodies = [];
  let offset = header.length;
  tables.forEach(({ tag, checksum, data }, i) => {
    const entry = 12 + 16 * i;
    tag.copy(header, entry);
    header.writeUInt32BE(checksum, entry + 4);
    header.writeUInt32BE(offset, entry + 8);
    header.writeUInt32BE(data.length, entry + 12);
    // tables are 4-byte aligned
    const body = Buffer.alloc((data.length + 3) & ~3);
    data.copy(body);
    bodies.push(body);
    offset += body.length;
  });
  return Buffer.concat([header, ...bodies]);
};

const escapeXml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// the static part of the neofetch text: "Uptime: $uptime" and other per-visit values are left out
const getNeofetchLines = () => {
  const [title, ...fields] = eng.neofetch.split("\n");
  return { title, fields: fields.filter((field) => !field.includes("$")) };
};

// "Role: Frontend developer" -> ["Role:", " Frontend developer"]; a line without a key -> ["", line]
const splitField = (field) => {
  const separator = field.indexOf(": ");
  return separator === -1
    ? ["", field]
    : [field.slice(0, separator + 1), field.slice(separator + 1)];
};

// "Ivan Tyulkin — Frontend developer, Saint Petersburg, React, TypeScript"
const getOgImageAlt = () => {
  const { title, fields } = getNeofetchLines();
  const values = fields.map((field) => splitField(field)[1].trim());
  return `${title} — ${values.join(", ")}`;
};

const rowTop = (row) => TITLE_BAR_HEIGHT + PADDING + row * LINE_HEIGHT;
const columnLeft = (column) => PADDING + column * CHAR_WIDTH;

// a line of colored spans: [[text, color], …] starting at the given column
const textLine = (row, column, spans) => {
  const tspans = spans
    .map(([text, color]) => `<tspan fill="${color}">${escapeXml(text)}</tspan>`)
    .join("");
  return `<text x="${columnLeft(column)}" y="${rowTop(row) + FONT_SIZE}">${tspans}</text>`;
};

// a filled block of character cells: the caret and the palette ("███" is not in the font subset)
const cells = (row, column, width, color) =>
  `<rect x="${columnLeft(column)}" y="${rowTop(row) + FONT_SIZE * 0.15}" width="${width * CHAR_WIDTH}" height="${FONT_SIZE * 1.1}" fill="${color}"/>`;

const getSvg = () => {
  const { title, fields } = getNeofetchLines();
  const infoColumn = Math.max(...logo.map((line) => line.length)) + 3;
  const shapes = [
    textLine(0, 0, [
      [`${PROMPT} `, COLORS.muted],
      ["neofetch", COLORS.text],
    ]),
  ];

  logo.forEach((line, i) => shapes.push(textLine(2 + i, 0, [[line, COLORS.text]])));
  const info = [
    [[title, COLORS.accent]],
    [["-".repeat(title.length), COLORS.text]],
    ...fields.map((field) => {
      const [key, value] = splitField(field);
      return [
        [key, COLORS.accent],
        [value, COLORS.text],
      ];
    }),
  ];
  // nobody looks at the card on every content change: fail the build rather than publish a clipped
  // line or blank glyphs (only the Latin subset of the font is loaded)
  const maxColumns = Math.floor((WIDTH - 2 * PADDING) / CHAR_WIDTH);
  for (const text of [title, ...fields]) {
    if (infoColumn + text.length > maxColumns) {
      throw new Error(
        `og-image: "${text}" doesn't fit the card (${maxColumns - infoColumn} chars)`,
      );
    }
    if (/[^\x20-\x7e\u00a0-\u00ff\u2000-\u206f]/.test(text)) {
      throw new Error(`og-image: "${text}" has characters outside the Latin font subset`);
    }
  }
  info.forEach((spans, i) => shapes.push(textLine(2 + i, infoColumn, spans)));
  // the color blocks under neofetch, after an empty line
  const paletteRow = 2 + info.length + 1;
  [COLORS.text, COLORS.muted, COLORS.accent, COLORS.error].forEach((color, i) =>
    shapes.push(cells(paletteRow, infoColumn + i * 3, 3, color)),
  );

  const lastRow = Math.max(2 + logo.length, paletteRow + 1) + 1;
  shapes.push(
    textLine(lastRow, 0, [[`${PROMPT} `, COLORS.muted]]),
    cells(lastRow, PROMPT.length + 1, 1, COLORS.caret),
  );
  const dots = [COLORS.error, COLORS.muted, COLORS.accent].map(
    (color, i) =>
      `<circle cx="${28 + i * 24}" cy="${TITLE_BAR_HEIGHT / 2}" r="7" fill="${color}"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" xml:space="preserve">
<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}"/>
<rect width="${WIDTH}" height="${TITLE_BAR_HEIGHT}" fill="${COLORS.frame}"/>
${dots.join("")}
<g font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}">
${shapes.join("\n")}
</g>
</svg>`;
};

const renderOgImage = () => {
  // the Node build of resvg loads fonts from files only
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "og-image-"));
  try {
    const fontFile = path.join(dir, "font.ttf");
    fs.writeFileSync(fontFile, woffToSfnt(fs.readFileSync(FONT_FILE)));
    const resvg = new Resvg(getSvg(), {
      font: {
        fontFiles: [fontFile],
        // the same picture on every machine: no fallback to system fonts
        loadSystemFonts: false,
        defaultFontFamily: FONT_FAMILY,
      },
    });
    return resvg.render().asPng();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

module.exports = {
  escapeXml,
  OG_IMAGE: { fileName: "og-image.png", width: WIDTH, height: HEIGHT },
  getOgImageAlt,
  renderOgImage,
};
