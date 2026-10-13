import { expect, Page, test } from "@playwright/test";
import eng from "../src/localization/dictionaries/eng.json";
import { BASE_PATH } from "../playwright.config";

const input = (page: Page) => page.getByRole("textbox", { name: eng.inputLabel });
const lastLog = (page: Page) => page.getByRole("log").getByRole("listitem").last();

// the tested build is the published one and may load third-party scripts (analytics): the tests
// don't wait for them and don't depend on their servers
test.beforeEach(async ({ page, baseURL }) => {
  const { host } = new URL(baseURL!);
  await page.route(
    (url) => url.host !== host,
    (route) => route.abort(),
  );
});

// the app is ready when the welcome text of the page is logged
const open = async (page: Page, path = "") => {
  const response = await page.goto(path);
  await expect(page.getByRole("log")).toContainText(path ? eng.settingsWelcome : eng.welcome);
  return response;
};

test("runs a typed command", async ({ page }) => {
  await open(page);
  await page.keyboard.type("about");
  await page.keyboard.press("Enter");
  await expect(lastLog(page)).toContainText("Ivan Tyulkin");
  await expect(input(page)).toHaveValue("");
});

test("autocompletes by Tab", async ({ page }) => {
  await open(page);
  await page.keyboard.type("edu");
  await page.keyboard.press("Tab");
  await expect(input(page)).toHaveValue("education");
  // Tab completes the line instead of moving the focus away
  await expect(input(page)).toBeFocused();
});

test("recalls the history by arrows", async ({ page }) => {
  await open(page);
  for (const command of ["help", "about"]) {
    await page.keyboard.type(command);
    await page.keyboard.press("Enter");
  }
  await page.keyboard.press("ArrowUp");
  await expect(input(page)).toHaveValue("about");
  await page.keyboard.press("ArrowUp");
  await expect(input(page)).toHaveValue("help");
  await page.keyboard.press("ArrowDown");
  await expect(input(page)).toHaveValue("about");
});

test("searches the history by Ctrl+R and keeps it after a reload (TASK-61)", async ({ page }) => {
  await open(page);
  for (const command of ["skills", "help"]) {
    await page.keyboard.type(command);
    await page.keyboard.press("Enter");
  }
  await page.reload();
  await expect(page.getByRole("log")).toContainText(eng.welcome);
  // Ctrl+R searches instead of reloading the page
  await page.keyboard.press("Control+r");
  await page.keyboard.type("sk");
  await expect(page.getByText("': skills")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(lastLog(page)).toContainText(eng.skills.split("\n")[0]);
});

test("runs a command clicked in the output", async ({ page }) => {
  await open(page);
  await page.keyboard.type("help");
  await page.keyboard.press("Enter");
  await lastLog(page).getByRole("button", { name: "about", exact: true }).click();
  await expect(lastLog(page)).toContainText("Ivan Tyulkin");
  // the click went to the history like a typed command (the button keeps the focus)
  await input(page).focus();
  await page.keyboard.press("ArrowUp");
  await expect(input(page)).toHaveValue("about");
});

test("rains in the theme colors by matrix, closes on a key (TASK-65)", async ({ page }) => {
  await open(page);
  await page.keyboard.type("matrix");
  await page.keyboard.press("Enter");
  await expect(page.getByText(eng.matrixExit)).toBeVisible();
  // the rain is drawn: some pixel differs from the theme background
  await expect
    .poll(() =>
      page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
        const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
        return data.some((value, index) => index % 4 !== 3 && value > 64);
      }),
    )
    .toBe(true);
  await page.keyboard.press("q");
  await expect(page.getByText(eng.matrixExit)).toBeHidden();
  await expect(input(page)).toHaveValue("");
});

test("navigates between pages under the base path", async ({ page }) => {
  await open(page);
  await page.keyboard.type("settings");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${BASE_PATH}settings`);
  await expect(lastLog(page)).toHaveText(eng.settingsWelcome);

  await page.keyboard.type("back");
  await page.keyboard.press("Enter");
  // the router basename has no trailing slash, so the root is "/tyulkin" (Pages serves both)
  await expect(page).toHaveURL((url) => `${url.pathname.replace(/\/$/, "")}/` === BASE_PATH);
  await expect(lastLog(page)).toHaveText(eng.welcome);
});

test("walks the virtual file system, the directory is in the URL (TASK-60)", async ({ page }) => {
  await open(page);
  await page.keyboard.type("cd projects");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${BASE_PATH}projects`);
  await expect(lastLog(page)).toHaveText(eng.projectsWelcome);
  await expect(page.getByText("visitor@tyulkin:~/projects$", { exact: true })).toBeVisible();

  await page.keyboard.type("ls ..");
  await page.keyboard.press("Enter");
  await lastLog(page).getByRole("button", { name: "about.md" }).click();
  await expect(lastLog(page)).toContainText("Ivan Tyulkin");

  // a reload keeps the directory: the SPA fallback opens the same page
  await page.reload();
  await expect(page.getByRole("log")).toContainText(eng.projectsWelcome);
});

test("opens a page by a direct link (SPA fallback)", async ({ page }) => {
  // the static host has no /settings file and answers with 404.html, which is the same app
  const response = await open(page, "settings");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(`${BASE_PATH}settings`);
  await page.keyboard.type("show themes");
  await page.keyboard.press("Enter");
  await expect(lastLog(page)).toContainText("Hacker");
});

test("shares a deep link that runs the command under the base path (TASK-62)", async ({ page }) => {
  await open(page);
  await page.keyboard.type("about");
  await page.keyboard.press("Enter");
  await page.keyboard.type("share");
  await page.keyboard.press("Enter");
  // the link is logged whether the clipboard is allowed or not
  const link = new URL(`${BASE_PATH}?cmd=about`, page.url()).toString();
  await expect(lastLog(page)).toContainText(link);

  await page.goto(link);
  await expect(lastLog(page)).toContainText("Ivan Tyulkin");
  await expect(page.getByRole("log")).toContainText(eng.welcome);
  // the parameter is dropped, so a reload doesn't run the command again
  await expect(page).toHaveURL(
    (url) => url.search === "" && `${url.pathname.replace(/\/$/, "")}/` === BASE_PATH,
  );
});

test("takes the theme of a light system until one is set (TASK-73)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, "settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "White");
  await page.keyboard.type("set theme nord");
  await page.keyboard.press("Enter");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "Nord");
});

test("opens the site root without the trailing slash", async ({ page }) => {
  await page.goto(BASE_PATH.replace(/\/$/, ""));
  await expect(page.getByRole("log")).toContainText(eng.welcome);
  await expect(page).toHaveURL(BASE_PATH);
});

test("focuses the input by a tap on the console @mobile", async ({ page }) => {
  await open(page);
  await input(page).blur();
  await expect(input(page)).not.toBeFocused();

  await page.getByRole("log").tap();
  await expect(input(page)).toBeFocused();
  await page.keyboard.type("about");
  await page.keyboard.press("Enter");
  await expect(lastLog(page)).toContainText("Ivan Tyulkin");
});

test("fits the neofetch welcome into a phone screen @mobile", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("log")).toContainText("Uptime: ");
  // the logo gives its room to the text
  await expect(page.getByRole("log").locator("pre")).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test.describe("boot animation (TASK-53)", () => {
  test.use({ reducedMotion: "no-preference" });

  test("types out the boot, skips it by a key, plays once per session", async ({ page }) => {
    await page.goto("");
    const log = page.getByRole("log");
    const [firstBootLine] = eng.bootLines.split("\n");
    await expect(log).toContainText(firstBootLine);

    // the whole boot takes ~2 s to type out; a key shows it at once and still reaches the input
    await page.keyboard.press("a");
    await expect(log).toContainText(eng.welcome, { timeout: 1000 });
    await expect(input(page)).toHaveValue("a");
    await expect(log).toHaveAttribute("aria-busy", "false");

    await page.reload();
    await expect(log).toContainText(eng.welcome);
    await expect(log).not.toContainText(firstBootLine);
  });
});

test.describe("regular view (TASK-59)", () => {
  test("switches terminal ⇄ gui and prints the CV by cv --download", async ({ page }) => {
    // the print dialog would block the page: counted instead
    await page.addInitScript(() => {
      const w = window as unknown as { printCalls: number };
      w.printCalls = 0;
      window.print = () => {
        w.printCalls++;
      };
    });
    await open(page);
    await page.getByRole("link", { name: eng.switchToGui }).click();
    await expect(page).toHaveURL(`${BASE_PATH}gui`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ivan Tyulkin");
    await expect(page.getByRole("heading", { name: eng.guiExperience })).toBeVisible();

    await page.getByRole("link", { name: eng.switchToTerminal }).click();
    await expect(page.getByRole("log")).toContainText(eng.welcome);
    await page.keyboard.type("cv --download");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${BASE_PATH}gui`);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { printCalls: number }).printCalls))
      .toBe(1);

    // a reload doesn't print again; the page marks the session in an effect that runs
    // together with the print one, so the check waits for the effects
    await page.evaluate(() => sessionStorage.removeItem("guiOffered"));
    await page.reload();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("guiOffered"))).toBe("true");
    expect(
      await page.evaluate(() => (window as unknown as { printCalls: number }).printCalls),
    ).toBe(0);
  });

  test("fits a phone screen @mobile", async ({ page }) => {
    await page.goto("gui");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test("serves the link preview card (TASK-75)", async ({ page, request }) => {
  const response = await request.get("og-image.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  // PNG IHDR: the width and the height right after the signature and the chunk header
  const png = await response.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);

  // absolute URLs only when the build knows where it is published (SITE_URL, set in CI)
  await page.goto("");
  const ogImage = page.locator('meta[property="og:image"]');
  if (process.env.SITE_URL) {
    const siteUrl = new URL(process.env.SITE_URL.replace(/\/?$/, "/")).href;
    await expect(ogImage).toHaveAttribute("content", new URL("og-image.png", siteUrl).href);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", siteUrl);
  } else {
    await expect(ogImage).toHaveCount(0);
  }
});

test.describe("installable app (TASK-77)", () => {
  test("serves the manifest for the whole site under the base path", async ({ page, request }) => {
    await page.goto("");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBe(`${BASE_PATH}manifest.webmanifest`);
    const response = await request.get(href!);
    expect(response.headers()["content-type"]).toContain("application/manifest+json");
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      start_url: BASE_PATH,
      scope: BASE_PATH,
      display: "standalone",
    });
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith(BASE_PATH)).toBe(true);
      expect((await request.get(icon.src)).status()).toBe(200);
    }
  });

  test("works offline once visited, deep links included", async ({ page, context }) => {
    await open(page);
    // the worker precaches the site and takes the page over (clients.claim)
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);

    await context.setOffline(true);
    await page.goto("?cmd=about");
    await expect(lastLog(page)).toContainText("Ivan Tyulkin");
    await page.goto("settings");
    await expect(page.getByRole("log")).toContainText(eng.settingsWelcome);
    await context.setOffline(false);
  });
});
