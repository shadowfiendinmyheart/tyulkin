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
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
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
  expect(getLastLog()).toBe("Available themes: White, Black, Light, Dark, Hacker");
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
