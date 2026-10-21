import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../router/routes";
import { AppContext } from "../../context/appContext";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";
import logsStyles from "../Logs/styles.module.scss";

// offline before the chunk of the games was cached
vi.mock("./GameScreen", () => {
  throw new Error("offline");
});

const t = createT(eng);

// jsdom has no layout
Element.prototype.scrollIntoView = () => undefined;

const renderConsole = () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(
    <StrictMode>
      <AppContext.Provider
        value={{
          appState: { status: "ok", theme: "Black", previewTheme: null },
          appDispatch: () => undefined,
        }}
      >
        <LocalizationContext.Provider
          value={{ language: "eng", t, changeLanguage: () => Promise.resolve(t) }}
        >
          <RouterProvider router={router} />
        </LocalizationContext.Provider>
      </AppContext.Provider>
    </StrictMode>,
  );
  return { user: userEvent.setup() };
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("a game that couldn't load (TASK-101)", () => {
  it("is logged, and its block is marked failed", async () => {
    const { user } = renderConsole();
    await user.keyboard("snake{Enter}");
    const error = await screen.findByText(eng.gameLoadFailed);
    expect(screen.queryByRole("dialog")).toBeNull();
    const echo = screen
      .getAllByRole("listitem")
      .filter((item) => item.classList.contains(logsStyles.echo))
      .at(-1);
    expect(echo?.textContent).toContain("snake");
    expect(echo?.querySelector(`.${logsStyles.failed}`)).toBeTruthy();
    expect(error.closest("li")?.dataset.block).toBe(echo?.dataset.block);
  });
});
