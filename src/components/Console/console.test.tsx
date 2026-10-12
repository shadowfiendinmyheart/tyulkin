import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
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

const getLogs = () => screen.queryAllByRole("listitem").map((item) => item.textContent);

// the main page greets with neofetch, then the welcome text (TASK-54)
const neofetch = expect.stringContaining("Uptime: ");
const mainWelcome = [neofetch, eng.welcome];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // jsdom has no matchMedia; reduced motion: no boot, logs are not typed out (see TASK-53 tests)
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("console", () => {
  it("does not crash on Enter before the first input (TASK-22)", async () => {
    const { user } = renderConsole();
    await user.keyboard("{Enter}");
    expect(getLogs()).toEqual([...mainWelcome, "cv> "]);
  });

  it("runs a command", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}");
    expect(getLogs()).toContain("cv> about");
    expect(getLogs()).toContain(eng.about);
  });

  it("renders links in contacts (TASK-48)", async () => {
    const { user } = renderConsole();
    await user.keyboard("contacts{Enter}");
    expect(getLogs()).toContain(eng.contacts);
    const github = screen.getByRole("link", { name: "https://github.com/shadowfiendinmyheart" });
    expect(github.getAttribute("href")).toBe("https://github.com/shadowfiendinmyheart");
    expect(github.getAttribute("target")).toBe("_blank");
    const email = screen.getByRole("link", { name: "tyulkindev@yandex.ru" });
    expect(email.getAttribute("href")).toBe("mailto:tyulkindev@yandex.ru");
    // no blank tab for links that open an app
    expect(email.hasAttribute("target")).toBe(false);
  });

  it("does not focus the input on a link click (TASK-48)", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("contacts{Enter}");
    input.blur();
    await user.click(screen.getByRole("link", { name: "tyulkindev@yandex.ru" }));
    expect(document.activeElement).not.toBe(input);
  });

  it("does not turn typed input into links (TASK-48)", async () => {
    const { user } = renderConsole();
    await user.keyboard("https://example.com{Enter}");
    expect(getLogs()).toContain("cv> https://example.com");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("reports an unknown command and respects word boundaries (TASK-25)", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("set themeblack{Enter}");
    expect(getLogs().at(-1)).toContain("Command set themeblack not found");
  });

  it("suggests the closest command for a typo (TASK-57)", async () => {
    const { user } = renderConsole();
    await user.keyboard("abuot{Enter}");
    expect(getLogs().at(-1)).toMatch(/^Command abuot not found[\s\S]*\nDid you mean about\?$/);

    await user.keyboard("qwerty{Enter}");
    expect(getLogs().at(-1)).not.toContain(eng.didYouMean);
  });

  it("autocompletes by Tab", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("edu{Tab}");
    expect(input.value).toBe("education");
  });

  it("logs the welcome text once under StrictMode (TASK-32)", async () => {
    const { user } = renderConsole();
    expect(getLogs()).toEqual(mainWelcome);

    await user.keyboard("settings{Enter}menu{Enter}");
    expect(getLogs().filter((log) => log === eng.welcome)).toHaveLength(2);
    expect(getLogs().filter((log) => log === eng.settingsWelcome)).toHaveLength(1);
  });

  it("lists Tab options only when there are several (TASK-37)", async () => {
    const { user, input } = renderConsole();
    const getHint = () =>
      Array.from(document.getElementsByClassName(hintStyles.command), (item) => item.textContent);

    await user.keyboard("ex{Tab}");
    expect(getHint()).toEqual(["experience", "exit"]);
    expect(input.value).toBe("ex");

    // cycling keeps the list
    await user.keyboard("{Tab}{Tab}");
    expect(input.value).toBe("exit");
    expect(getHint()).toEqual(["experience", "exit"]);

    // a single option clears the shown list and is completed right away
    await user.keyboard("{Backspace}{Backspace}{Backspace}d{Tab}");
    expect(input.value).toBe("education");
    expect(getHint()).toEqual([]);
  });
});

describe("neofetch (TASK-54)", () => {
  it("shows the current settings, also on the settings page", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("set caret line{Enter}neofetch{Enter}");
    const log = getLogs().at(-1);
    expect(log).toContain("Theme: Black");
    expect(log).toContain("Caret: line");
    expect(log).toContain("Language: eng");
  });
});

describe("command registry (TASK-33)", () => {
  it("generates help from page and global commands", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("help{Enter}");
    const help = within(screen.getAllByRole("listitem").at(-1)!)
      .getAllByRole("row")
      .map((row) => Array.from((row as HTMLTableRowElement).cells, (cell) => cell.textContent));
    expect(help[0]).toEqual(["set theme", "set the theme"]);
    expect(help).toContainEqual(["show languages", "list languages"]);
    expect(help).toContainEqual(["back (cd .., cd..)", "go back"]);
    expect(help.at(-1)).toEqual(["neofetch", "a short summary about me and the terminal"]);
  });

  it("generates ls from page and global commands", async () => {
    const { user } = renderConsole();
    await user.keyboard("ls{Enter}");
    expect(getLogs().at(-1)).toBe(
      "about   back   clear   contacts   education   experience   help   ls   menu   neofetch   projects   settings   skills",
    );
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
    const hintText = t({ key: "inputHint", args: { help: "help" } });
    const getHint = () => document.querySelector(`.${inputStyles.hint}`);
    expect(getHint()?.textContent).toBe(hintText);
    expect(input.getAttribute("aria-describedby")).toBe(getHint()?.id);

    await user.keyboard("h");
    expect(getHint()).toBeNull();
    expect(input.hasAttribute("aria-describedby")).toBe(false);

    await user.keyboard("{Backspace}");
    expect(getHint()?.textContent).toBe(hintText);

    await user.keyboard("help{Enter}");
    expect(getHint()).toBeNull();
  });
});

describe("clickable commands (TASK-55)", () => {
  it("runs a clicked command as if it was typed", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("ls{Enter}");
    await user.click(
      within(screen.getAllByRole("listitem").at(-1)!).getByRole("button", { name: "about" }),
    );
    expect(getLogs().slice(-2)).toEqual(["cv> about", eng.about]);
    // the keyboard is not popped up on mobile
    expect(document.activeElement).not.toBe(input);

    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("ls");
  });

  it("keeps the browsed history entry and the draft when a command is clicked", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("ls{Enter}pro{ArrowUp}");
    expect(input.value).toBe("ls");
    await user.click(
      within(screen.getAllByRole("listitem").at(-1)!).getByRole("button", { name: "about" }),
    );
    input.focus();
    await user.keyboard("{ArrowDown}");
    expect(input.value).toBe("about");
    await user.keyboard("{ArrowDown}");
    expect(input.value).toBe("pro");
  });

  it("presses a focused command button with Enter", async () => {
    const { user } = renderConsole();
    await user.keyboard("ls{Enter}");
    within(screen.getAllByRole("listitem").at(-1)!).getByRole("button", { name: "about" }).focus();
    await user.keyboard("{Enter}");
    expect(getLogs().slice(-2)).toEqual(["cv> about", eng.about]);
  });

  it("makes help, ls and the suggestion clickable in the unknown command output", async () => {
    const { user } = renderConsole();
    await user.keyboard("abuot{Enter}");
    const log = within(screen.getAllByRole("listitem").at(-1)!);
    expect(log.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "help",
      "ls",
      "about",
    ]);
    await user.click(log.getByRole("button", { name: "help" }));
    expect(getLogs().at(-2)).toBe("cv> help");
  });

  it("runs help from the input hint", async () => {
    const { user } = renderConsole();
    await user.click(screen.getByRole("button", { name: "help" }));
    expect(getLogs().at(-2)).toBe("cv> help");
    expect(document.querySelector(`.${inputStyles.hint}`)).toBeNull();
  });
});

describe("UX shortcuts (TASK-52)", () => {
  it("runs commands case-insensitively and autocompletes regardless of case", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("ABOUT{Enter}");
    expect(getLogs().at(-1)).toBe(eng.about);

    await user.keyboard("EDU{Tab}");
    expect(input.value).toBe("education");
  });

  it("clears the screen on Ctrl+L and keeps the typed line", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}hel");
    await user.keyboard("{Control>}l{/Control}");
    expect(screen.queryAllByRole("listitem")).toEqual([]);
    expect(input.value).toBe("hel");
  });

  it("treats the physical L key as Ctrl+L on a non-Latin layout", () => {
    renderConsole();
    const input = screen.getByRole("textbox");
    expect(fireEvent.keyDown(input, { key: "д", code: "KeyL", ctrlKey: true })).toBe(false);
    expect(screen.queryAllByRole("listitem")).toEqual([]);
  });

  it("drops the typed line on Ctrl+C without recording it", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}draft");
    await user.keyboard("{Control>}c{/Control}");
    expect(input.value).toBe("");
    expect(getLogs().at(-1)).toBe("cv> draft^C");

    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");
  });

  it("leaves Ctrl+C to copying when text is selected", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("draft");
    const selection = window.getSelection();
    selection?.selectAllChildren(screen.getByRole("log"));
    expect(fireEvent.keyDown(input, { key: "c", code: "KeyC", ctrlKey: true })).toBe(true);
    expect(input.value).toBe("draft");
    selection?.removeAllRanges();
  });

  it("keeps the selection in logs on Ctrl so Ctrl+C copies it", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("draft");
    input.blur();
    const selection = window.getSelection();
    selection?.selectAllChildren(screen.getByRole("log"));

    fireEvent.keyDown(document.body, { key: "Control", ctrlKey: true });
    expect(document.activeElement).not.toBe(input);
    expect(selection?.toString()).toContain("Hi everyone!");

    // without a selection any key focuses the command line
    selection?.removeAllRanges();
    fireEvent.keyDown(document.body, { key: "Control", ctrlKey: true });
    expect(document.activeElement).toBe(input);
  });

  it("ignores Ctrl+C during IME composition", () => {
    renderConsole();
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.keyDown(input, { key: "Process", code: "KeyC", ctrlKey: true, isComposing: true });
    expect(input.value).toBe("ab");
  });
});

describe("boot and typing out (TASK-53)", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // a log at a time: the next one starts typing after a render
  const typeOut = () => {
    for (let i = 0; i < 20; i++) act(() => vi.advanceTimersByTime(1000));
  };
  const bootLines = eng.bootLines.split("\n");

  it("types out the boot before the welcome once per session", () => {
    const lastLogin = new Date(2026, 0, 2, 3, 4, 5);
    localStorage.setItem("lastLogin", String(lastLogin.getTime()));
    renderConsole();
    // typing out: nothing yet, the live region waits
    expect(getLogs()).toEqual([]);
    expect(screen.getByRole("log").getAttribute("aria-busy")).toBe("true");

    typeOut();
    const date = lastLogin.toLocaleString("en", { dateStyle: "medium", timeStyle: "medium" });
    expect(getLogs()).toEqual([
      eng.bootLastLogin.replace("$date", date),
      ...bootLines,
      ...mainWelcome,
    ]);
    expect(screen.getByRole("log").getAttribute("aria-busy")).toBe("false");
    // this visit is the last login of the next session
    expect(Number(localStorage.getItem("lastLogin"))).toBeGreaterThan(lastLogin.getTime());

    cleanup();
    renderConsole();
    typeOut();
    expect(getLogs()).toEqual(mainWelcome);
  });

  it("leaves out the last login on the first visit", () => {
    renderConsole();
    typeOut();
    expect(getLogs()).toEqual([...bootLines, ...mainWelcome]);
  });

  it("shows everything at once on any key, the key still goes to the input", () => {
    const { input } = renderConsole();
    act(() => vi.advanceTimersByTime(100));
    expect(getLogs()).toHaveLength(1);

    fireEvent.keyDown(input, { key: "a" });
    expect(getLogs()).toEqual([...bootLines, ...mainWelcome]);
    expect(getLogs().at(-1)).toBe(eng.welcome);
    fireEvent.change(input, { target: { value: "a" } });
    expect(input.value).toBe("a");
  });

  it("shows everything at once on a click or tap", () => {
    renderConsole();
    fireEvent.click(document.body);
    expect(getLogs().at(-1)).toBe(eng.welcome);
  });

  it("echoes the command at once and types out its output", () => {
    const { input } = renderConsole();
    fireEvent.keyDown(input, { key: "a" });
    fireEvent.change(input, { target: { value: "about" } });
    fireEvent.keyDown(input, { key: "Enter" });
    act(() => vi.advanceTimersByTime(50));

    expect(getLogs().at(-2)).toBe("cv> about");
    const typed = getLogs().at(-1) ?? "";
    expect(typed.length).toBeLessThan(eng.about.length);
    expect(eng.about.startsWith(typed)).toBe(true);

    typeOut();
    expect(getLogs().at(-1)).toBe(eng.about);
  });

  it("does not boot with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    renderConsole();
    expect(getLogs()).toEqual(mainWelcome);
  });
});
