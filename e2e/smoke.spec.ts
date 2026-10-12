import { expect, Page, test } from "@playwright/test";
import eng from "../src/localization/dictionaries/eng.json";
import { BASE_PATH } from "../playwright.config";

const input = (page: Page) => page.getByRole("textbox", { name: eng.inputLabel });
const lastLog = (page: Page) => page.getByRole("log").getByRole("listitem").last();

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

test("opens a page by a direct link (SPA fallback)", async ({ page }) => {
  // the static host has no /settings file and answers with 404.html, which is the same app
  const response = await open(page, "settings");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(`${BASE_PATH}settings`);
  await page.keyboard.type("show themes");
  await page.keyboard.press("Enter");
  await expect(lastLog(page)).toContainText("Hacker");
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
