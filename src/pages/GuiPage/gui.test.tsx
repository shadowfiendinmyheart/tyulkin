import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../router/routes";
import { AppContext } from "../../context/appContext";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";

const t = createT(eng);

// jsdom has no layout: the terminal a test switches to scrolls to its prompt
Element.prototype.scrollIntoView = () => undefined;

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
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "startViewTransition");
});

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

  expect(screen.getByRole("button", { name: eng.guiPrint })).toBeTruthy();
});

it("shows the experience as a timeline: a job a mark with its title, period and description", () => {
  renderGui();
  const experience = within(screen.getByRole("region", { name: eng.guiExperience }));
  const jobs = experience.getAllByRole("listitem");
  const paragraphs = eng.experience.split("\n\n");
  expect(jobs).toHaveLength(paragraphs.length);
  jobs.forEach((job, index) => {
    const [title, period, ...lines] = paragraphs[index].split("\n");
    expect(within(job).getByRole("heading", { level: 3 }).textContent).toBe(title);
    // the texts are the same the terminal prints, nothing is lost
    expect(job.textContent).toBe(`${title}${period}${lines.join("\n")}`);
  });
});

it("shows the skills as tags grouped by category", () => {
  renderGui();
  const skills = within(screen.getByRole("region", { name: eng.guiSkills }));
  const lines = eng.skills.split("\n");
  expect(skills.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
    lines.map((line) => line.slice(0, line.indexOf(": "))),
  );
  expect(skills.getAllByRole("list")).toHaveLength(lines.length);
  const tags = skills.getAllByRole("listitem").map((tag) => tag.textContent);
  expect(tags[0]).toBe("JavaScript");
  // a comma inside parentheses doesn't split a tag
  expect(tags).toContain("monorepo (Lerna)");
  // nothing is lost
  expect(tags.join(", ")).toBe(lines.map((line) => line.slice(line.indexOf(": ") + 2)).join(", "));
});

// with reduced motion the transition has no animation: that is CSS (main.scss)
it("switches to the terminal by a view transition", () => {
  const startViewTransition = vi.fn((update: () => void) => {
    update();
    const done = Promise.resolve();
    return { ready: done, finished: done, updateCallbackDone: done, skipTransition: vi.fn() };
  });
  Object.assign(document, { startViewTransition });
  const router = renderGui();
  fireEvent.click(screen.getByRole("link", { name: eng.switchToTerminal }));
  expect(startViewTransition).toHaveBeenCalledOnce();
  expect(router.state.location.pathname).toBe("/");
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
