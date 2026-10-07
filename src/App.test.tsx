import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import eng from "./localization/dictionaries/eng.json";
import ru from "./localization/dictionaries/ru.json";

// jsdom has no layout and no matchMedia; reduced motion skips the loading animation
Element.prototype.scrollIntoView = () => undefined;

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  localStorage.clear();
  localStorage.setItem("language", "eng");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const getLastLog = () => screen.getAllByRole("listitem").at(-1)?.textContent;

it("switches the language without a reload (TASK-34)", async () => {
  render(<App />);
  await screen.findByText(eng.welcome);
  expect(document.documentElement.lang).toBe("en");

  const user = userEvent.setup();
  await user.keyboard("settings{Enter}set language ru{Enter}");

  await waitFor(() => expect(getLastLog()).toBe("Язык ru успешно установлен"));
  expect(document.documentElement.lang).toBe("ru");
  expect(localStorage.getItem("language")).toBe("ru");

  // commands use the new dictionary right away
  await user.keyboard("show themes{Enter}");
  expect(getLastLog()).toBe("Доступные темы: White, Black, Light, Dark, Hacker");
  await user.keyboard("set language{Enter}");
  expect(getLastLog()).toBe("Доступные языки: ru, eng");
  // and the welcome text is not logged again
  expect(screen.getAllByText(eng.settingsWelcome)).toHaveLength(1);
  expect(screen.queryByText(ru.settingsWelcome)).toBeNull();
});
