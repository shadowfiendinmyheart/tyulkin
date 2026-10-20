import { DEFAULT_FONT_MODE, FontMode } from "../domain";

// the font of the terminal (TASK-83): the family of each font in CSS and in messages
export const fontFamilies: Record<FontMode, string> = {
  "ibm-plex-mono": "IBM Plex Mono",
  "jetbrains-mono": "JetBrains Mono",
  "fira-code": "Fira Code",
};

// IBM Plex Mono comes with the page (main.tsx): it stands in while another font is fetched
export const getFontStack = (font: FontMode) =>
  font === DEFAULT_FONT_MODE
    ? `"${fontFamilies[font]}", monospace`
    : `"${fontFamilies[font]}", "${fontFamilies[DEFAULT_FONT_MODE]}", monospace`;

// the @font-face rules of the other fonts, in their own chunks: all subsets with unicode-range,
// the browser fetches only the files of the text shown (as for IBM Plex Mono)
const fontLoaders: Record<FontMode, (() => Promise<unknown>) | undefined> = {
  "ibm-plex-mono": undefined,
  "jetbrains-mono": () => import("@fontsource/jetbrains-mono/400"),
  "fira-code": () => import("@fontsource/fira-code/400"),
};

const loadedFonts = new Map<FontMode, Promise<void>>();

// resolves once the rules of the font are in the page; a failed load (offline) is tried again
// on the next call
export const loadFont = (font: FontMode): Promise<void> => {
  const loaded = loadedFonts.get(font);
  if (loaded) return loaded;
  const loading = Promise.resolve(fontLoaders[font]?.()).then(() => undefined);
  loadedFonts.set(font, loading);
  loading.catch(() => loadedFonts.delete(font));
  return loading;
};

// set on <html> by the terminal pages (ConsolePage): the font family of the page (main.scss) and
// the font size of the console (ConsolePage styles)
export const FONT_FAMILY_PROPERTY = "--terminal-font-family";
export const FONT_SIZE_PROPERTY = "--terminal-font-size";
