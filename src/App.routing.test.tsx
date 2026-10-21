import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import eng from "./localization/dictionaries/eng.json";

const dictionaryLoad = vi.hoisted(() => ({ fails: false }));

vi.mock("./localization", async (importOriginal) => {
  const original = await importOriginal<typeof import("./localization")>();
  return {
    ...original,
    loadDictionary: (...args: Parameters<typeof original.loadDictionary>) =>
      dictionaryLoad.fails
        ? Promise.reject(new Error("network error"))
        : original.loadDictionary(...args),
  };
});

// jsdom has no layout and no matchMedia; reduced motion skips the loading animation
Element.prototype.scrollIntoView = () => undefined;

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion") }));
  localStorage.clear();
  localStorage.setItem("language", "eng");
  dictionaryLoad.fails = false;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// the router is created on import from the current URL, so every test gets a fresh one
const renderAppAt = async (url: string) => {
  window.history.replaceState(null, "", url);
  vi.resetModules();
  const { default: App } = await import("./App");
  render(<App />);
};

const getLastLog = () => screen.getAllByRole("listitem").at(-1)?.textContent;

it("opens /settings/ with a trailing slash as /settings (TASK-28)", async () => {
  await renderAppAt("/settings/?a=1#b");

  await screen.findByText(eng.settingsWelcome);
  await waitFor(() => expect(window.location.pathname).toBe("/settings"));
  expect(window.location.search).toBe("?a=1");
  expect(window.location.hash).toBe("#b");
  expect(screen.getAllByText(eng.settingsWelcome)).toHaveLength(1);

  // settings commands work and `back` leads to the main menu
  const user = userEvent.setup();
  await user.keyboard("show themes{Enter}");
  expect(getLastLog()).toBe(
    "Available themes, click one to set it:\nWhite\nBlack\nLight\nDark\nHacker\nDracula\nSolarized\nGruvbox\nNord\nMonokai",
  );
  await user.keyboard("back{Enter}");
  await waitFor(() => expect(window.location.pathname).toBe("/"));
  await screen.findByText(eng.welcome);
});

it("shows the error screen when the dictionary fails to load (TASK-29)", async () => {
  dictionaryLoad.fails = true;
  await renderAppAt("/");

  await screen.findByText("500");
  expect(screen.getByText(/failed to load the dictionary/)).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("runs a command clicked in the output of another page on that page (TASK-103)", async () => {
  await renderAppAt("/settings");
  await screen.findByText(eng.settingsWelcome);

  const user = userEvent.setup();
  await user.keyboard("show themes{Enter}");
  await user.keyboard("nope{Enter}");
  await user.keyboard("back{Enter}");
  await waitFor(() => expect(window.location.pathname).toBe("/"));
  await screen.findByText(eng.welcome);

  // `help` is global: it runs on the open page
  const logsBefore = screen.getAllByRole("listitem").length;
  await user.click(screen.getAllByRole("button", { name: "help" })[0]);
  expect(window.location.pathname).toBe("/");
  expect(screen.getAllByRole("listitem").length).toBe(logsBefore + 2);

  // `set theme` is a command of ~/settings only: the click goes back there and runs it
  await user.click(screen.getByRole("button", { name: "Nord" }));
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe("Nord"));
  expect(window.location.pathname).toBe("/settings");
  expect(screen.getAllByRole("listitem").at(-2)?.textContent).toContain("set theme Nord");
  expect(getLastLog()).toBe(eng.changeTheme.replace("$themeName", "Nord"));
  // the command is dropped from the history entry: coming back to it doesn't run it again
  expect(window.history.state?.usr ?? null).toBeNull();
});
