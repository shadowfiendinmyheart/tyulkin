import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
// tested under a subpath, as deployed to GitHub Pages: catches absolute URLs that ignore the base path.
// CI passes the deployed one (E2E_BASE_PATH), and the tested build is the one that is published
const basePathName = (process.env.E2E_BASE_PATH ?? "tyulkin").replace(/^\/+|\/+$/g, "");
export const BASE_PATH = basePathName ? `/${basePathName}/` : "/";
// own output dir: a local `npm run build` in dist/ is not overwritten with the subpath build
const OUTPUT_DIR = "dist-e2e";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    locale: "en-US",
    // skips the loading animation
    reducedMotion: "reduce",
    // the default theme follows the color scheme (TASK-73): the tests expect the Black one
    colorScheme: "dark",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    // Chromium with a phone viewport and touch; only the tests tagged @mobile
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: [
      `npm run build -- --env basePath=${BASE_PATH} --output-path ${OUTPUT_DIR}`,
      `node e2e/server.mjs ${OUTPUT_DIR} ${PORT} ${BASE_PATH}`,
    ].join(" && "),
    url: `http://localhost:${PORT}${BASE_PATH}`,
    // always a fresh build: a server left on the port would be tested with stale code
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
