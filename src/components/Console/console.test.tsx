import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../../router/routes";
import { AppContext } from "../../context/appContext";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";
import { CaretMode } from "../../domain";
import inputStyles from "../Input/styles.module.scss";
import hintStyles from "../CommandsHint/style.module.scss";

const t = createT(eng);

// jsdom has no layout
Element.prototype.scrollIntoView = () => undefined;

// StrictMode as in main.tsx: effects run twice on mount in dev
const renderConsole = (path = "/") => {
  render(
    <StrictMode>
      <AppContext.Provider
        value={{
          appState: { status: "ok", theme: "Black" },
          appDispatch: () => undefined,
        }}
      >
        <LocalizationContext.Provider
          value={{ language: "eng", t, changeLanguage: () => Promise.resolve(t) }}
        >
          <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
        </LocalizationContext.Provider>
      </AppContext.Provider>
    </StrictMode>,
  );
  return { user: userEvent.setup(), input: screen.getByRole("textbox") as HTMLInputElement };
};

const getLogs = () => screen.getAllByRole("listitem").map((item) => item.textContent);

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("console", () => {
  it("does not crash on Enter before the first input (TASK-22)", async () => {
    const { user } = renderConsole();
    await user.keyboard("{Enter}");
    expect(getLogs()).toEqual(["Hi everyone!", "cv> "]);
  });

  it("runs a command", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}");
    expect(getLogs()).toContain("cv> about");
    expect(getLogs()).toContain(eng.about);
  });

  it("reports an unknown command and respects word boundaries (TASK-25)", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("set themeblack{Enter}");
    expect(getLogs().at(-1)).toContain("Command set themeblack not found");
  });

  it("autocompletes by Tab", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("edu{Tab}");
    expect(input.value).toBe("education");
  });

  it("logs the welcome text once under StrictMode (TASK-32)", async () => {
    const { user } = renderConsole();
    expect(getLogs()).toEqual([eng.welcome]);

    await user.keyboard("settings{Enter}menu{Enter}");
    expect(getLogs().filter((log) => log === eng.welcome)).toHaveLength(2);
    expect(getLogs().filter((log) => log === eng.settingsWelcome)).toHaveLength(1);
  });

  it("lists Tab options only when there are several (TASK-37)", async () => {
    const { user, input } = renderConsole();
    const getHint = () =>
      Array.from(document.getElementsByClassName(hintStyles.command), (item) => item.textContent);

    await user.keyboard("e{Tab}");
    expect(getHint()).toEqual(["education", "exit"]);
    expect(input.value).toBe("e");

    // cycling keeps the list
    await user.keyboard("{Tab}{Tab}");
    expect(input.value).toBe("exit");
    expect(getHint()).toEqual(["education", "exit"]);

    // a single option clears the shown list and is completed right away
    await user.keyboard("{Backspace}{Backspace}{Backspace}d{Tab}");
    expect(input.value).toBe("education");
    expect(getHint()).toEqual([]);
  });
});

describe("command registry (TASK-33)", () => {
  it("generates help from page and global commands", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("help{Enter}");
    const help = getLogs().at(-1)?.split("\n");
    expect(help?.[0]).toBe("set theme - set the theme");
    expect(help).toContain("show languages - list languages");
    expect(help?.at(-1)).toBe("ls - list commands");
  });

  it("generates ls from page and global commands", async () => {
    const { user } = renderConsole();
    await user.keyboard("ls{Enter}");
    expect(getLogs().at(-1)).toBe("about   back   clear   education   help   ls   menu   settings");
  });

  it("runs and autocompletes aliases", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("cd s{Tab}");
    expect(input.value).toBe("cd settings");

    await user.keyboard("{Enter}");
    expect(getLogs().at(-1)).toBe("Settings menu");

    await user.keyboard("exit{Enter}");
    expect(getLogs().at(-1)).toBe("Hi everyone!");
  });
});

describe("history (TASK-23)", () => {
  it("browses executed commands with ArrowUp/ArrowDown and restores the draft", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}education{Enter}dra");

    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("education");
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");

    await user.keyboard("{ArrowDown}");
    expect(input.value).toBe("education");
    await user.keyboard("{ArrowDown}");
    expect(input.value).toBe("dra");
  });

  it("records the executed command, not the draft", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}draft");
    await user.keyboard("{ArrowUp}{Enter}");

    expect(getLogs().filter((log) => log === "cv> about")).toHaveLength(2);
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");
  });

  it("records a command completed by Tab", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("edu{Tab}{Enter}");
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("education");
  });

  it("does not record empty commands", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}{Enter}   {Enter}");
    await user.clear(input);
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(input.value).toBe("about");
  });

  it("treats an edited history entry as a new draft", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}help{Enter}");
    await user.keyboard("{ArrowUp}{ArrowUp}x");
    expect(input.value).toBe("aboutx");

    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("help");
    await user.keyboard("{ArrowDown}");
    expect(input.value).toBe("aboutx");
  });
  it("does not record a command equal to the previous one", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("help{Enter}about{Enter}{ArrowUp}{Enter}about{Enter}");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(input.value).toBe("help");
  });

  it("treats a line edited back to the browsed entry as a new draft", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}help{Enter}old");
    await user.keyboard("{ArrowUp}x{Backspace}");
    expect(input.value).toBe("help");

    await user.keyboard("{ArrowDown}");
    expect(input.value).toBe("help");
  });

  it("keeps the native caret in place on ArrowUp/ArrowDown at the history edges", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}");

    expect(fireEvent.keyDown(input, { key: "ArrowDown" })).toBe(false);
    expect(fireEvent.keyDown(input, { key: "ArrowUp" })).toBe(false);
    expect(fireEvent.keyDown(input, { key: "ArrowUp" })).toBe(false);
  });
});

describe("caret (TASK-26)", () => {
  // localStorage is cleared before each test, so the caret mode is the default one
  const caretClass = new RegExp(`_${CaretMode.Block}_`);

  // drawn caret as a native selection offset: the number of chars before it
  const getDrawnCaret = (input: HTMLInputElement) => {
    // not lastElementChild: the help hint (TASK-49) may follow the chars
    const chars = Array.from(
      input.parentElement?.querySelector(`.${inputStyles.chars}`)?.children ?? [],
    );
    const carets = chars.filter((char) => caretClass.test(char.className));
    if (carets.length !== 1) throw new Error(`expected one drawn caret, got ${carets.length}`);
    const caretIndex = chars.indexOf(carets[0]);
    const hasZeroChar = /_zeroChar_/.test(chars[0].className);
    return hasZeroChar ? caretIndex : caretIndex + 1;
  };

  it("follows arrows, Home, End and Delete", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("abc");
    expect(getDrawnCaret(input)).toBe(3);

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(getDrawnCaret(input)).toBe(1);

    await user.keyboard("{Home}");
    expect(getDrawnCaret(input)).toBe(0);

    await user.keyboard("{End}");
    expect(getDrawnCaret(input)).toBe(3);

    await user.keyboard("{Home}{Delete}");
    expect(input.value).toBe("bc");
    expect(getDrawnCaret(input)).toBe(0);
  });

  it("follows a mouse click and a paste", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("abc");

    await user.pointer({ target: input, offset: 1, keys: "[MouseLeft]" });
    expect(input.selectionStart).toBe(1);
    expect(getDrawnCaret(input)).toBe(1);

    await user.paste("xy");
    expect(input.value).toBe("axybc");
    expect(getDrawnCaret(input)).toBe(3);
  });

  it("moves to the end after Tab autocomplete and history browsing", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}edu{Home}{Tab}");
    expect(input.value).toBe("education");
    expect(getDrawnCaret(input)).toBe(9);

    await user.keyboard("{Home}{ArrowUp}");
    expect(input.value).toBe("about");
    expect(getDrawnCaret(input)).toBe(5);

    // typing after a replacement edits in place, without jumping to the end
    await user.keyboard("{Home}x");
    expect(input.value).toBe("xabout");
    expect(input.selectionStart).toBe(1);
    expect(getDrawnCaret(input)).toBe(1);
  });

  it("moves to the end when Tab or history yields the same line", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Home}{Tab}");
    expect(input.value).toBe("about");
    expect(input.selectionStart).toBe(5);
    expect(getDrawnCaret(input)).toBe(5);

    await user.keyboard("{Enter}about{Home}{ArrowUp}");
    expect(input.value).toBe("about");
    expect(input.selectionStart).toBe(5);
    expect(getDrawnCaret(input)).toBe(5);
  });

  it("follows the collapsed end of a selection", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("abc{Home}");
    input.setSelectionRange(0, 2);
    fireEvent.select(input);

    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
    expect(getDrawnCaret(input)).toBe(2);
  });
});

describe("accessibility (TASK-49)", () => {
  it("labels the command line", () => {
    renderConsole();
    expect(screen.getByRole("textbox", { name: eng.inputLabel })).toBeTruthy();
  });

  it("announces logs in a live region", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}");
    const log = screen.getByRole("log");
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(log.textContent).toContain(eng.about);
  });

  it("shows the help hint until the first command is executed", async () => {
    const { user, input } = renderConsole();
    expect(screen.getByText(eng.inputHint)).toBeTruthy();
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByText(eng.inputHint).id);

    await user.keyboard("h");
    expect(screen.queryByText(eng.inputHint)).toBeNull();
    expect(input.hasAttribute("aria-describedby")).toBe(false);

    await user.keyboard("{Backspace}");
    expect(screen.getByText(eng.inputHint)).toBeTruthy();

    await user.keyboard("help{Enter}");
    expect(screen.queryByText(eng.inputHint)).toBeNull();
  });
});
