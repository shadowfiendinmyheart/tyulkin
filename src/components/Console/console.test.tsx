import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../router/routes";
import { AppContext, AppContextType } from "../../context/appContext";
import { setTheme } from "../../store/app/actions";
import { KONAMI_CODE } from "../../hooks/useKonamiCode";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";
import { CaretMode, crtModes, secretIds, soundModes, themeModes } from "../../domain";
import { getParamsString } from "../../commandHandlers/utils";
import inputStyles from "../Input/styles.module.scss";
import hintStyles from "../CommandsHint/style.module.scss";
import { QUICK_COMMANDS, QUICK_COMMANDS_TYPED_LIMIT } from "../QuickCommands";
import { GUI_HINT_DELAY_MS } from "../../pages/ConsolePage";
import pageStyles from "../../pages/ConsolePage/styles.module.scss";

const t = createT(eng);

// jsdom has no layout
Element.prototype.scrollIntoView = () => undefined;

// StrictMode as in main.tsx: effects run twice on mount in dev
const renderConsole = (
  path = "/",
  appDispatch: AppContextType["appDispatch"] = () => undefined,
) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <StrictMode>
      <AppContext.Provider
        value={{
          appState: { status: "ok", theme: "Black" },
          appDispatch,
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
  return {
    user: userEvent.setup(),
    input: screen.getByRole("textbox") as HTMLInputElement,
    router,
  };
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
    expect(getLogs()).toEqual([...mainWelcome, "visitor@tyulkin:~$ "]);
  });

  it("runs a command", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}");
    expect(getLogs()).toContain("visitor@tyulkin:~$ about");
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
    expect(getLogs()).toContain("visitor@tyulkin:~$ https://example.com");
    expect(within(screen.getByRole("log")).queryByRole("link")).toBeNull();
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

describe("crt effect (TASK-64)", () => {
  const getCrt = () => document.querySelector(`.${pageStyles.crt}`);

  it("is off by default, turned on and off by set crt and kept in storage", async () => {
    const { user } = renderConsole("/settings");
    expect(getCrt()).toBeNull();
    await user.keyboard("set crt{Enter}");
    expect(getLogs().at(-1)).toBe(
      t({ key: "crtStatus", args: { state: eng.stateOff, modes: getParamsString(crtModes) } }),
    );

    await user.keyboard("set crt ON{Enter}");
    expect(getCrt()).not.toBeNull();
    expect(getLogs().at(-1)).toBe(t({ key: "changeCrt", args: { state: eng.stateOn } }));
    expect(localStorage.getItem("crtMode")).toBe("on");

    await user.keyboard("set crt off{Enter}");
    expect(getCrt()).toBeNull();
    expect(localStorage.getItem("crtMode")).toBe("off");
  });

  it("rejects an unknown mode", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("set crt maybe{Enter}");
    expect(getLogs().at(-1)).toBe(
      t({ key: "wrongCrt", args: { crtName: "maybe", modes: getParamsString(crtModes) } }),
    );
    expect(getCrt()).toBeNull();
  });
});

describe("keyboard sound (TASK-67)", () => {
  // jsdom has no Web Audio: a fake context counts the clicks played
  let clicks = 0;
  const node = () => ({ connect: () => undefined });
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    sampleRate = 44100;
    destination = {};
    resume = () => Promise.resolve();
    suspend = () => Promise.resolve();
    createBuffer = (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    });
    createBufferSource = () => {
      clicks++;
      return {
        ...node(),
        playbackRate: { value: 1 },
        start: () => undefined,
        stop: () => undefined,
      };
    };
    createBiquadFilter = () => ({ ...node(), frequency: { value: 0 }, Q: { value: 0 } });
    createGain = () => ({
      ...node(),
      gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
    });
  }

  beforeEach(() => {
    clicks = 0;
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  it("is off by default, turned on and off by set sound and kept in storage", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("set sound{Enter}");
    expect(clicks).toBe(0);
    expect(getLogs().at(-1)).toBe(
      t({ key: "soundStatus", args: { state: eng.stateOff, modes: getParamsString(soundModes) } }),
    );

    await user.keyboard("set sound ON{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "changeSound", args: { state: eng.stateOn } }));
    expect(localStorage.getItem("soundMode")).toBe("on");

    // a click per key, modifiers are silent
    await user.keyboard("ab{Shift>}C{/Shift}");
    expect(clicks).toBe(3);

    await user.keyboard("{Control>}c{/Control}set sound off{Enter}");
    const clicksWhenOff = clicks;
    expect(localStorage.getItem("soundMode")).toBe("off");
    await user.keyboard("abc");
    expect(clicks).toBe(clicksWhenOff);
  });

  it("rejects an unknown mode", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("set sound loud{Enter}");
    expect(getLogs().at(-1)).toBe(
      t({ key: "wrongSound", args: { soundName: "loud", modes: getParamsString(soundModes) } }),
    );
    expect(localStorage.getItem("soundMode")).toBeNull();
  });
});

describe("command registry (TASK-33)", () => {
  it("generates help from page and global commands", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("help{Enter}");
    const help = within(screen.getAllByRole("listitem").at(-1)!)
      .getAllByRole("row")
      .map((row) => Array.from((row as HTMLTableRowElement).cells, (cell) => cell.textContent));
    expect(help[0]).toEqual(["set theme", "set the theme (random: any other one)"]);
    expect(help).toContainEqual(["show languages", "list languages"]);
    expect(help).toContainEqual(["back (cd..)", "go back"]);
    expect(help.at(-1)).toEqual(["share", eng.helpShare]);
  });

  it("runs and autocompletes aliases", async () => {
    const { user } = renderConsole("/settings");
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

    expect(getLogs().filter((log) => log === "visitor@tyulkin:~$ about")).toHaveLength(2);
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
    await user.keyboard("help{Enter}");
    await user.click(
      within(screen.getAllByRole("listitem").at(-1)!).getByRole("button", { name: "about" }),
    );
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin:~$ about", eng.about]);
    // the keyboard is not popped up on mobile
    expect(document.activeElement).not.toBe(input);

    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("help");
  });

  it("keeps the browsed history entry and the draft when a command is clicked", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("help{Enter}pro{ArrowUp}");
    expect(input.value).toBe("help");
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
    await user.keyboard("help{Enter}");
    within(screen.getAllByRole("listitem").at(-1)!).getByRole("button", { name: "about" }).focus();
    await user.keyboard("{Enter}");
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin:~$ about", eng.about]);
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
    expect(getLogs().at(-2)).toBe("visitor@tyulkin:~$ help");
  });

  it("runs help from the input hint", async () => {
    const { user } = renderConsole();
    const hint = document.querySelector<HTMLElement>(`.${inputStyles.hint}`)!;
    await user.click(within(hint).getByRole("button", { name: "help" }));
    expect(getLogs().at(-2)).toBe("visitor@tyulkin:~$ help");
    expect(document.querySelector(`.${inputStyles.hint}`)).toBeNull();
  });
});

describe("quick commands (TASK-58)", () => {
  const queryChips = () => screen.queryByRole("group", { name: eng.quickCommandsLabel });
  const getChipNames = () =>
    within(queryChips()!)
      .getAllByRole("button")
      .map((button) => button.textContent);

  it("runs a chip as if it was typed, without popping up the keyboard", async () => {
    const { user, input } = renderConsole();
    expect(getChipNames()).toEqual(QUICK_COMMANDS);
    input.blur();

    await user.click(within(queryChips()!).getByRole("button", { name: "projects" }));
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin:~$ projects", eng.projects]);
    expect(document.activeElement).not.toBe(input);
  });

  it("shows only the commands of the page", () => {
    renderConsole("/settings");
    expect(getChipNames()).toEqual(["help"]);
  });

  it("hides after a few typed commands, clicked and empty ones don't count", async () => {
    const { user, input } = renderConsole();
    // one typed command short of the limit, mixed with empty lines
    for (let i = 1; i < QUICK_COMMANDS_TYPED_LIMIT; i++)
      await user.keyboard("about{Enter}{Enter}   {Enter}");
    await user.click(within(queryChips()!).getByRole("button", { name: "contacts" }));
    await user.click(within(queryChips()!).getByRole("button", { name: "about" }));
    expect(queryChips()).not.toBeNull();

    input.focus();
    await user.keyboard("ls{Enter}");
    expect(queryChips()).toBeNull();
  });

  it("stays hidden after moving between pages", async () => {
    const { user } = renderConsole();
    for (let i = 1; i < QUICK_COMMANDS_TYPED_LIMIT; i++) await user.keyboard("about{Enter}");
    await user.keyboard("settings{Enter}");
    expect(queryChips()).toBeNull();
    await user.keyboard("menu{Enter}");
    expect(queryChips()).toBeNull();
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
    expect(getLogs().at(-1)).toBe("visitor@tyulkin:~$ draft^C");

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
    // typing out takes long fake seconds: the offer of the regular view would join the logs
    sessionStorage.setItem("guiOffered", "true");
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

    expect(getLogs().at(-2)).toBe("visitor@tyulkin:~$ about");
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

describe("regular view (TASK-59)", () => {
  const guiHint = 'Prefer a regular view? Type gui or click "regular view" at the top';

  it("opens the regular view by gui and the switch, the terminal session survives", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}");
    await user.keyboard("gui{Enter}");
    expect(await screen.findByRole("heading", { level: 1, name: "Ivan Tyulkin" })).toBeTruthy();

    await user.click(screen.getByRole("link", { name: eng.switchToTerminal }));
    const input = (await screen.findByRole("textbox")) as HTMLInputElement;
    // the earlier output and history are kept, the page greets again
    expect(getLogs()).toEqual([
      ...mainWelcome,
      "visitor@tyulkin:~$ about",
      eng.about,
      "visitor@tyulkin:~$ gui",
      ...mainWelcome,
    ]);
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(input.value).toBe("about");

    await user.click(screen.getByRole("link", { name: eng.switchToGui }));
    expect(await screen.findByRole("heading", { name: eng.guiExperience })).toBeTruthy();
  });

  it("prints the regular view by cv --download (TASK-48)", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    try {
      const { user } = renderConsole();
      await user.keyboard("cv --DOWNLOAD{Enter}");
      await screen.findByRole("heading", { level: 1 });
      // once, though StrictMode runs effects twice
      expect(print).toHaveBeenCalledTimes(1);
    } finally {
      print.mockRestore();
    }
  });

  it("explains cv without --download", async () => {
    const { user } = renderConsole();
    await user.keyboard("cv{Enter}");
    const usage = "Type cv --download to save the CV as PDF or gui to open it as a regular page";
    expect(getLogs().at(-1)).toBe(usage);
    await user.keyboard("cv --pdf{Enter}");
    expect(getLogs().at(-1)).toBe(usage);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  describe("offer to an idle visitor", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("is logged once after a while without keys, clicks and commands", () => {
      renderConsole();
      act(() => vi.advanceTimersByTime(GUI_HINT_DELAY_MS - 1000));
      // activity restarts the wait
      fireEvent.keyDown(document.body, { key: "a" });
      act(() => vi.advanceTimersByTime(GUI_HINT_DELAY_MS - 1000));
      fireEvent.pointerDown(document.body);
      act(() => vi.advanceTimersByTime(GUI_HINT_DELAY_MS - 1000));
      expect(getLogs()).toEqual(mainWelcome);

      act(() => vi.advanceTimersByTime(1000));
      expect(getLogs()).toEqual([...mainWelcome, guiHint]);
      expect(within(screen.getByRole("log")).getByRole("button", { name: "gui" })).toBeTruthy();

      // once per session
      cleanup();
      renderConsole();
      act(() => vi.advanceTimersByTime(GUI_HINT_DELAY_MS * 4));
      expect(getLogs()).toEqual(mainWelcome);
    });

    it("is not logged after a command or on the settings page", () => {
      const { input } = renderConsole();
      fireEvent.change(input, { target: { value: "about" } });
      fireEvent.keyDown(input, { key: "Enter" });
      act(() => vi.advanceTimersByTime(GUI_HINT_DELAY_MS * 4));
      expect(getLogs()).not.toContain(guiHint);

      cleanup();
      renderConsole("/settings");
      act(() => vi.advanceTimersByTime(GUI_HINT_DELAY_MS * 4));
      expect(getLogs()).toEqual([eng.settingsWelcome]);
    });
  });
});

describe("deep links (TASK-62)", () => {
  it("runs the command of the link once, after the welcome, and drops it from the address", async () => {
    const { router } = renderConsole("/?cmd=about#top");
    await waitFor(() =>
      expect(getLogs()).toEqual([...mainWelcome, "visitor@tyulkin:~$ about", eng.about]),
    );
    expect(router.state.location).toMatchObject({ pathname: "/", search: "", hash: "#top" });
    // the command went to the history like a typed one
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowUp" });
    expect(screen.getByRole("textbox")).toHaveProperty("value", "about");
  });

  it("runs a command with an argument on its page", async () => {
    renderConsole("/Settings?cmd=show+themes");
    await waitFor(() =>
      expect(getLogs()).toEqual([
        eng.settingsWelcome,
        "visitor@tyulkin:~/settings$ show themes",
        t({ key: "themeList", args: { themes: getParamsString(themeModes) } }),
      ]),
    );
  });

  it("does not leave the link in the history when the command navigates", async () => {
    const { router } = renderConsole("/?cmd=settings");
    await waitFor(() => expect(router.state.location.pathname).toBe("/settings"));
    await act(() => router.navigate(-1));
    expect(router.state.location).toMatchObject({ pathname: "/", search: "" });
    expect(getLogs().filter((log) => log === "visitor@tyulkin:~$ settings")).toHaveLength(1);
  });

  it("ignores an empty command", async () => {
    const { router } = renderConsole("/?cmd=%20");
    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(getLogs()).toEqual(mainWelcome);
  });
});

describe("share (TASK-62)", () => {
  it("copies a link to the latest command", async () => {
    // user-event provides the clipboard
    const { user } = renderConsole();
    await user.keyboard("about{Enter}share{Enter}");
    const link = `${window.location.origin}/?cmd=about`;
    expect(await navigator.clipboard.readText()).toBe(link);
    await waitFor(() =>
      expect(getLogs()).toContain(t({ key: "shareCopied", args: { command: "about", link } })),
    );
  });

  it("shows the link when copying fails", async () => {
    const { user } = renderConsole();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await user.keyboard("help{Enter}share{Enter}");
    const link = `${window.location.origin}/?cmd=help`;
    await waitFor(() =>
      expect(getLogs()).toContain(t({ key: "shareNotCopied", args: { command: "help", link } })),
    );
  });

  it("links the page the command is run on", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("show themes{Enter}share{Enter}");
    const link = `${window.location.origin}/settings?cmd=show+themes`;
    expect(await navigator.clipboard.readText()).toBe(link);
  });

  it("has nothing to share before a command with output", async () => {
    const { user } = renderConsole();
    await user.keyboard("share{Enter}clear{Enter}settings{Enter}menu{Enter}share{Enter}");
    const nothing = t({ key: "shareNothing", args: { help: "help" } });
    expect(getLogs().at(-1)).toBe(nothing);
    expect(
      within(screen.getAllByRole("listitem").at(-1)!).getByRole("button", { name: "help" }),
    ).toBeTruthy();
  });
});

describe("matrix and the Konami code (TASK-65)", () => {
  beforeEach(() => {
    // jsdom has no canvas: the rain is not drawn, the overlay works without it
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const queryMatrix = () => screen.queryByText(eng.matrixExit);

  it("covers the console by matrix, any key closes it and is not typed", async () => {
    const { user, input } = renderConsole("/settings");
    await user.keyboard("matrix{Enter}");
    expect(queryMatrix()).toBeTruthy();

    await user.keyboard("x");
    expect(queryMatrix()).toBeNull();
    expect(input.value).toBe("");
    // the console works as before
    await user.keyboard("x");
    expect(input.value).toBe("x");
  });

  it("is not closed by the held Enter that ran it", async () => {
    const { user } = renderConsole();
    await user.keyboard("matrix{Enter}");
    fireEvent.keyDown(document.activeElement!, { key: "Enter", repeat: true });
    expect(queryMatrix()).toBeTruthy();
  });

  it("closes matrix on a tap without pressing anything beneath", async () => {
    const { user } = renderConsole();
    await user.keyboard("matrix{Enter}");
    const logsCount = getLogs().length;
    fireEvent.click(screen.getByRole("button", { name: QUICK_COMMANDS[0] }));
    expect(queryMatrix()).toBeNull();
    expect(getLogs()).toHaveLength(logsCount);
  });

  it("closes matrix when the page is left without a key or tap", async () => {
    const { user, router } = renderConsole();
    await user.keyboard("settings{Enter}matrix{Enter}");
    expect(queryMatrix()).toBeTruthy();
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/");
    expect(queryMatrix()).toBeNull();
  });

  it("switches to the secret theme by the Konami code and stores it", async () => {
    const appDispatch = vi.fn();
    const { user, input } = renderConsole("/", appDispatch);
    const keys = KONAMI_CODE.map((key) => (key.length === 1 ? key : `{${key}}`)).join("");
    // the code may follow other keys, its own first key included
    await user.keyboard(`{ArrowUp}${keys}`);
    expect(appDispatch).toHaveBeenCalledWith(setTheme("Amber"));
    expect(localStorage.getItem("themeMode")).toBe("Amber");
    // B and A of the code are not typed into the command line
    expect(input.value).toBe("");
    expect(getLogs().at(-2)).toBe(t({ key: "secretTheme", args: { themeName: "Amber" } }));
    // the code is one of the secrets (TASK-63)
    expect(getLogs().at(-1)).toBe(
      t({ key: "secretFound", args: { found: "1", total: "10", secrets: "secrets" } }),
    );
  });

  it("takes the physical B and A keys on a non-Latin layout", () => {
    const appDispatch = vi.fn();
    renderConsole("/", appDispatch);
    KONAMI_CODE.slice(0, -2).forEach((key) => fireEvent.keyDown(document.body, { key }));
    fireEvent.keyDown(document.body, { key: "Shift" });
    fireEvent.keyDown(document.body, { key: "И", code: "KeyB" });
    fireEvent.keyDown(document.body, { key: "ф", code: "KeyA" });
    expect(appDispatch).toHaveBeenCalledWith(setTheme("Amber"));
  });

  it("does not list or set the secret theme by set theme", async () => {
    const appDispatch = vi.fn();
    const { user } = renderConsole("/settings", appDispatch);
    await user.keyboard("set theme amber{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "wrongTheme", args: { themeName: "Amber" } }));
    expect(appDispatch).not.toHaveBeenCalled();
  });

  it("sets a random theme, never the current or the secret one (TASK-73)", async () => {
    const appDispatch = vi.fn();
    const { user } = renderConsole("/settings", appDispatch);
    const others = themeModes.filter((theme) => theme !== "Black");
    const random = vi.spyOn(Math, "random");
    // every pick in turn: the lowest value of each slot, then the highest one Math.random gives
    others.forEach((_, index) => random.mockReturnValueOnce(index / others.length));
    random.mockReturnValueOnce(1 - Number.EPSILON);
    for (let i = 0; i <= others.length; i++) await user.keyboard("set theme RANDOM{Enter}");
    expect(appDispatch.mock.calls).toEqual(
      [...others, others.at(-1)].map((theme) => [setTheme(theme!)]),
    );
    expect(localStorage.getItem("themeMode")).toBe(others.at(-1));
    expect(getLogs().at(-1)).toBe(t({ key: "changeTheme", args: { themeName: others.at(-1)! } }));
  });
});

describe("easter eggs (TASK-63)", () => {
  const found = (count: number) =>
    t({ key: "secretFound", args: { found: String(count), total: "10", secrets: "secrets" } });

  it("hides secret commands from help, ls and autocomplete", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("help{Enter}ls{Enter}");
    const logs = getLogs().join("\n");
    for (const name of ["sudo", "cowsay", "fortune", "vim", "coffee"]) {
      expect(logs).not.toContain(name);
    }
    await user.type(input, "cows{Tab}");
    expect(input.value).toBe("cows");
  });

  it("answers sudo with anything and counts the secret once", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("sudo rm -rf /{Enter}");
    expect(getLogs().slice(-2)).toEqual([eng.sudo, found(1)]);
    await user.keyboard("SUDO{Enter}");
    expect(getLogs().at(-1)).toBe(eng.sudo);
    expect(JSON.parse(localStorage.getItem("foundSecrets")!)).toEqual(["sudo"]);
  });

  it("shows the contacts on sudo hire-me", async () => {
    const { user } = renderConsole();
    await user.keyboard("sudo hire-me{Enter}");
    expect(getLogs().slice(-3)).toEqual([eng.sudoHireMe, eng.contacts, found(1)]);
  });

  it("exits vim", async () => {
    const { user } = renderConsole();
    await user.keyboard("vim{Enter}");
    expect(getLogs().at(-2)).toBe(t({ key: "vim", args: { quit: ":q", forceQuit: ":q!" } }));
    await user.click(screen.getByRole("button", { name: ":q!" }));
    expect(getLogs().slice(-2)).toEqual([eng.vimExit, found(2)]);
  });

  it("puts the visitor's text into the cow's bubble", async () => {
    const { user } = renderConsole();
    await user.keyboard("cowsay hello   world{Enter}");
    expect(getLogs().at(-2)).toContain("< hello world >");
  });

  it("takes extra words after sudo hire-me and rm -rf /", async () => {
    const { user } = renderConsole();
    await user.keyboard("sudo hire-me please{Enter}");
    expect(getLogs().at(-3)).toBe(eng.sudoHireMe);
    await user.keyboard("rm -rf / --no-preserve-root{Enter}");
    expect(getLogs().at(-2)).toBe(eng.rmRfJoke);
  });

  it("is not run by a deep link: nobody links the site with their own text", async () => {
    renderConsole("/?cmd=cowsay+hire+me");
    await waitFor(() => expect(getLogs().at(-1)).toContain("Command cowsay hire me not found"));
    expect(localStorage.getItem("foundSecrets")).toBeNull();
  });

  it("takes no extra words after a secret command without arguments", async () => {
    const { user } = renderConsole();
    await user.keyboard("vim now{Enter}");
    expect(getLogs().at(-1)).toContain("Command vim now not found");
    expect(localStorage.getItem("foundSecrets")).toBeNull();
  });

  it("lists the found secrets", async () => {
    const { user } = renderConsole();
    await user.keyboard("secrets{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "secretsProgress", args: { found: "0", total: "10" } }));
    await user.keyboard("fortune{Enter}coffee{Enter}secrets{Enter}");
    expect(getLogs().at(-1)).toBe(
      t({ key: "secretsProgress", args: { found: "2", total: "10" } }) +
        "\n" +
        t({ key: "secretsList", args: { list: "fortune, coffee" } }),
    );
  });

  it("congratulates when all secrets are found", async () => {
    localStorage.setItem("foundSecrets", JSON.stringify([...secretIds]));
    const { user } = renderConsole();
    await user.keyboard("secrets{Enter}");
    expect(getLogs().at(-1)).toContain(t({ key: "secretsAll", args: { total: "10" } }));
    expect(getLogs().at(-1)).toContain(eng.secretKonami);
  });
});

describe("shell habits (TASK-61)", () => {
  it("lists the history oldest first and forgets it by history -c", async () => {
    const { user } = renderConsole();
    await user.keyboard("history{Enter}");
    expect(getLogs().at(-1)).toBe(eng.historyEmpty);

    await user.keyboard("about{Enter}whoami{Enter}history{Enter}");
    expect(getLogs().at(-1)).toBe("    1  history\n    2  about\n    3  whoami");

    await user.keyboard("history -c{Enter}");
    expect(getLogs().at(-1)).toBe(eng.historyCleared);
    expect(JSON.parse(localStorage.getItem("history")!)).toEqual([]);
    await user.keyboard("history foo{Enter}");
    expect(getLogs().at(-1)).toBe(eng.historyUsage);
  });

  it("keeps the history between visits", async () => {
    localStorage.setItem("history", JSON.stringify(["skills", 42, "about"]));
    const { user, input } = renderConsole();
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("skills");
    await user.clear(input);
    await user.keyboard("help{Enter}");
    expect(JSON.parse(localStorage.getItem("history")!)).toEqual(["help", "skills", "about"]);
  });

  it("repeats the previous command by !!, anywhere in the line", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("!!{Enter}");
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin:~$ !!", eng.historyNotFound]);

    await user.keyboard("about{Enter}!!{Enter}");
    expect(getLogs().slice(-3)).toEqual(["visitor@tyulkin:~$ !!", "about", eng.about]);
    // the history keeps the expanded command
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("about");

    await user.clear(input);
    await user.keyboard("echo !! twice{Enter}");
    expect(getLogs().at(-1)).toBe("about twice");
  });

  it("prints the text by echo, the user, the directory and the date", async () => {
    const { user } = renderConsole();
    await user.keyboard('echo "hello   world"{Enter}');
    expect(getLogs().at(-1)).toBe("hello world");
    await user.keyboard("whoami{Enter}");
    expect(getLogs().at(-1)).toBe("visitor");
    await user.keyboard("pwd{Enter}");
    expect(getLogs().at(-1)).toBe("/home/visitor");
    await user.keyboard("date{Enter}");
    expect(getLogs().at(-1)).toContain(String(new Date().getFullYear()));

    cleanup();
    const settings = renderConsole("/settings");
    await settings.user.keyboard("pwd{Enter}");
    expect(getLogs().at(-1)).toBe("/home/visitor/settings");
  });

  it("does not echo by a deep link: nobody links the site with their own text", async () => {
    renderConsole("/?cmd=echo+hired");
    await waitFor(() => expect(getLogs()).toContain("visitor@tyulkin:~$ echo hired"));
    expect(getLogs()).not.toContain("hired");
  });

  it("filters the output by | grep and highlights the word", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("help | grep caret{Enter}");
    const rows = within(screen.getAllByRole("listitem").at(-1)!).getAllByRole("row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "set caret" + eng.helpSetCaret,
      "show carets" + eng.helpShowCarets,
    ]);

    await user.keyboard("echo one two | grep -i TWO{Enter}");
    expect(getLogs().at(-1)).toBe("one two");
    await user.keyboard("echo one two | grep TWO{Enter}");
    expect(getLogs().at(-1)).toBe("visitor@tyulkin:~/settings$ echo one two | grep TWO");

    await user.keyboard("help | wc{Enter}");
    expect(getLogs().at(-1)).toBe(eng.pipeUsage);
  });

  it("searches the history by Ctrl+R", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}skills{Enter}help{Enter}");

    await user.keyboard("{Control>}r{/Control}");
    expect(screen.getByText(eng.reverseSearch)).toBeTruthy();
    expect(input.getAttribute("aria-label")).toBe(eng.reverseSearchLabel);
    await user.keyboard("l");
    expect(screen.getByText("': help")).toBeTruthy();
    // the next older match; none after it, so it stays
    await user.keyboard("{Control>}r{/Control}");
    expect(screen.getByText("': skills")).toBeTruthy();
    await user.keyboard("{Control>}r{/Control}");
    expect(screen.getByText("': skills")).toBeTruthy();
    await user.keyboard("x");
    expect(screen.getByText(eng.reverseSearchFailing)).toBeTruthy();
    await user.keyboard("{Backspace}{Enter}");
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin:~$ skills", eng.skills]);
    expect(input.value).toBe("");
  });

  it("puts the found entry into the line or cancels the search", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}draft");

    await user.keyboard("{Control>}r{/Control}ab{ArrowRight}");
    expect(input.value).toBe("about");
    expect(screen.queryByText(eng.reverseSearch)).toBeNull();

    await user.clear(input);
    await user.keyboard("draft{Control>}r{/Control}ab{Escape}");
    expect(input.value).toBe("draft");
    expect(screen.queryByText(eng.reverseSearch)).toBeNull();
  });
});

describe("virtual file system (TASK-60)", () => {
  const getLastLog = () => within(screen.getAllByRole("listitem").at(-1)!);

  it("lists the files, a click on one prints it from any page", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("ls{Enter}");
    expect(getLogs().at(-1)).toBe(
      "about.md   contacts.md   education.md   experience.md   projects/   settings/   skills.md",
    );
    await user.click(getLastLog().getByRole("button", { name: "about.md" }));
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin:~$ cat ~/about.md", eng.about]);

    input.focus();
    await user.keyboard("ls projects/{Enter}");
    expect(getLogs().at(-1)).toBe("README.md");
  });

  it("changes the directory with the page, the prompt and pwd", async () => {
    const { user, router } = renderConsole();
    await user.keyboard("cd projects{Enter}");
    expect(router.state.location.pathname).toBe("/projects");
    expect(getLogs().at(-1)).toBe(eng.projectsWelcome);
    expect(screen.getByText("visitor@tyulkin:~/projects$")).toBeTruthy();

    await user.keyboard("pwd{Enter}");
    expect(getLogs().slice(-2)).toEqual([
      "visitor@tyulkin:~/projects$ pwd",
      "/home/visitor/projects",
    ]);
    await user.keyboard("cat README.md{Enter}");
    expect(getLogs().at(-1)).toBe(eng.projects);

    await user.keyboard("cd ../settings{Enter}");
    expect(router.state.location.pathname).toBe("/settings");
    await user.keyboard("cd{Enter}");
    expect(router.state.location.pathname).toBe("/");
  });

  it("explains a wrong path", async () => {
    const { user, router } = renderConsole();
    await user.keyboard("cd nowhere{Enter}");
    expect(getLogs().at(-1)).toBe("cd: nowhere: No such file or directory");
    await user.keyboard("cd about.md{Enter}");
    expect(getLogs().at(-1)).toBe("cd: about.md: Not a directory");
    await user.keyboard("cat projects{Enter}");
    expect(getLogs().at(-1)).toBe("cat: projects: Is a directory");
    expect(router.state.location.pathname).toBe("/");

    await user.keyboard("cat{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "catUsage", args: { ls: "ls" } }));
  });

  it("draws the tree", async () => {
    const { user } = renderConsole("/projects");
    await user.keyboard("tree ..{Enter}");
    expect(getLogs().at(-1)).toContain("├── projects\n│   └── README.md\n");
  });

  it("completes paths by Tab", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("cat ab{Tab}");
    expect(input.value).toBe("cat about.md");
    await user.keyboard("{Control>}c{/Control}cd s{Tab}");
    expect(input.value).toBe("cd settings");
  });

  it("prints a file by a deep link", async () => {
    renderConsole("/?cmd=cat+skills.md");
    await waitFor(() =>
      expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin:~$ cat skills.md", eng.skills]),
    );
  });
});

describe("virtual file system edge cases (TASK-60)", () => {
  it("stays on the page by cd to its own directory", async () => {
    const { user, router } = renderConsole("/projects");
    await user.keyboard("cd .{Enter}");
    expect(router.state.historyAction).toBe("POP");
    expect(router.state.location.pathname).toBe("/projects");
  });

  it("tells that a file with a slash is not a directory", async () => {
    const { user } = renderConsole();
    await user.keyboard("cat about.md/{Enter}");
    expect(getLogs().at(-1)).toBe("cat: about.md/: Not a directory");
  });

  it("completes the bare command by Tab", async () => {
    const { user } = renderConsole();
    await user.keyboard("tr{Tab}");
    expect(screen.getByText("tree")).toBeTruthy();
  });
});
