// The installable app (PWA): the web app manifest and its icons, drawn at build time from the same
// terminal glyph as the favicon in src/index.html, and the service worker built from
// scripts/service-worker.js with the list of files to precache.
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

// the default Black theme (src/styles/themes.scss) and the favicon colors
const BACKGROUND = "#000";
const FOREGROUND = "#ccc";

// "> _" of the favicon in a 32×32 box
const GLYPH =
  `<path d="M7 10l6 6-6 6" fill="none" stroke="${FOREGROUND}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="M15 23h10" stroke="${FOREGROUND}" stroke-width="2.5" stroke-linecap="round"/>`;

// "any": the favicon as is (rounded corners); "maskable" and the Apple touch icon: the launcher
// crops the square itself, so the background is full-bleed and the glyph stays in the safe zone
// (the central 80% circle, https://w3c.github.io/manifest/#icon-masks)
const getIconSvg = (maskable) => {
  if (!maskable) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="${BACKGROUND}"/>${GLYPH}</svg>`;
  }
  const scale = 0.7;
  const offset = (32 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${BACKGROUND}"/><g transform="translate(${offset} ${offset}) scale(${scale})">${GLYPH}</g></svg>`;
};

const ICONS = [
  { fileName: "icons/icon-192.png", size: 192, maskable: false },
  { fileName: "icons/icon-512.png", size: 512, maskable: false },
  { fileName: "icons/icon-maskable-512.png", size: 512, maskable: true },
];
const APPLE_TOUCH_ICON = { fileName: "icons/apple-touch-icon.png", size: 180, maskable: true };

const renderIcon = ({ size, maskable }) =>
  new Resvg(getIconSvg(maskable), { fitTo: { mode: "width", value: size } }).render().asPng();

const MANIFEST_FILE = "manifest.webmanifest";
const SERVICE_WORKER_FILE = "sw.js";

// the app is the whole site under the base path: deep links (/tyulkin/gui, ?cmd=…) stay in it
const getManifest = (basePath) => ({
  id: basePath,
  // the same texts as <title> and the description in src/index.html
  name: "Ivan Tyulkin — Frontend developer",
  short_name: "Tyulkin",
  description:
    "Ivan Tyulkin — frontend developer from Saint Petersburg, Russia. Interactive terminal-style CV: type help to see the available commands.",
  lang: "en",
  start_url: basePath,
  scope: basePath,
  display: "standalone",
  background_color: BACKGROUND,
  theme_color: BACKGROUND,
  icons: ICONS.map(({ fileName, size, maskable }) => ({
    src: basePath + fileName,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: maskable ? "maskable" : "any",
  })),
});

// what the app needs offline: the page, scripts, styles (with the lazy dictionary chunks), all woff2
// subsets (Russian text offline needs the Cyrillic ones) and the PWA files with the icons. Not 404.html (the same page), the og:image card, licenses and the .woff
// fallbacks (every browser with service workers reads woff2)
const isPrecached = (name) =>
  /\.(html|js|css|woff2|png|webmanifest)$/.test(name) &&
  name !== "404.html" &&
  name !== SERVICE_WORKER_FILE &&
  !name.startsWith("og-image");

const SERVICE_WORKER_TEMPLATE = fs.readFileSync(path.join(__dirname, "service-worker.js"), "utf8");

// assets: [{ name, source: Buffer }]; the cache version is the content hash of the precached files,
// so a deploy that changes anything installs a new worker, and an unchanged one keeps the cache
const getServiceWorker = (assets) => {
  const precached = assets
    .filter(({ name }) => isPrecached(name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const hash = createHash("sha256");
  precached.forEach(({ name, source }) => hash.update(name).update(source));
  // index.html is requested as the scope root: that is the URL navigations go to
  const urls = precached.map(({ name }) => (name === "index.html" ? "./" : name));
  const version = hash.digest("hex").slice(0, 16);
  // replacer functions: a "$" in a file name is not a replacement pattern
  return SERVICE_WORKER_TEMPLATE.replace("__CACHE_VERSION__", () =>
    JSON.stringify(version),
  ).replace("__PRECACHE_URLS__", () => JSON.stringify(urls));
};

module.exports = {
  APPLE_TOUCH_ICON,
  ICONS,
  MANIFEST_FILE,
  SERVICE_WORKER_FILE,
  getManifest,
  getServiceWorker,
  renderIcon,
};
