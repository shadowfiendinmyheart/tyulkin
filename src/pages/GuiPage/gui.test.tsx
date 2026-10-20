import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../router/routes";
import { AppContext } from "../../context/appContext";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";

const t = createT(eng);

const renderGui = (path = "/gui") => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
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
  return router;
};

beforeEach(() => {
  sessionStorage.clear();
});
afterEach(cleanup);

it("shows the CV sections from the dictionary with clickable contacts", () => {
  renderGui();
  expect(screen.getByRole("heading", { level: 1, name: "Ivan Tyulkin" })).toBeTruthy();
  for (const title of [
    eng.guiContacts,
    eng.guiExperience,
    eng.guiSkills,
    eng.guiProjects,
    eng.guiEducation,
  ]) {
    expect(screen.getByRole("heading", { level: 2, name: title })).toBeTruthy();
  }

  const contacts = within(screen.getByRole("region", { name: eng.guiContacts }));
  const github = contacts.getByRole("link", { name: "https://github.com/shadowfiendinmyheart" });
  expect(github.getAttribute("target")).toBe("_blank");
  const email = contacts.getByRole("link", { name: "tyulkindev@yandex.ru" });
  expect(email.getAttribute("href")).toBe("mailto:tyulkindev@yandex.ru");
  expect(email.getAttribute("target")).toBeNull();

  // the texts are the same the terminal prints, nothing is lost
  const experience = screen.getByRole("region", { name: eng.guiExperience });
  expect(experience.textContent).toBe(`${eng.guiExperience}${eng.experience.replace(/\n\n/g, "")}`);
  expect(screen.getByRole("button", { name: eng.guiPrint })).toBeTruthy();
});

it("opens /gui/ with a trailing slash as /gui", async () => {
  const router = renderGui("/gui/");
  expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
  expect(router.state.location.pathname).toBe("/gui");
});

it("is not offered in the terminal once opened", () => {
  renderGui();
  expect(sessionStorage.getItem("guiOffered")).toBe("true");
});
