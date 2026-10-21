import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../router/routes";
import { AppContext, AppContextType } from "../../context/appContext";
import { setPreviewTheme, setTheme } from "../../store/app/actions";
import { KONAMI_CODE } from "../../hooks/useKonamiCode";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";
import {
  CaretMode,
  crtModes,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  fontModes,
  screensaverIds,
  secretIds,
  soundModes,
  themeModes,
} from "../../domain";
import { getParamsString } from "../../commandHandlers/utils";
import inputStyles from "../Input/styles.module.scss";
import hintStyles from "../CommandsHint/style.module.scss";
import { QUICK_COMMANDS, QUICK_COMMANDS_TYPED_LIMIT } from "../QuickCommands";
import { EXTRA_KEYS } from "../ExtraKeys";
import { GUI_HINT_DELAY_MS, SCREENSAVER_DELAY_MS, SHUTDOWN_MS } from "../../pages/ConsolePage";
import { ACHIEVEMENT_TOAST_MS } from "../../router/ConsoleSessionLayout";
import pageStyles from "../../pages/ConsolePage/styles.module.scss";
import logsStyles from "../Logs/styles.module.scss";
import { COPY_STATUS_MS } from "../Logs";
import { LONG_PRESS_MS } from "../../hooks/useLongPress";

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
          appState: { status: "ok", theme: "Black", previewTheme: null },
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

// the toast of a found secret (TASK-97): the live region is there with or without one
const getToast = () => screen.getByRole("status").textContent;
const achievement = (name: string, found: number) =>
  t({ key: "achievementUnlocked", args: { name, found: String(found), total: "10" } });

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
    expect(getLogs()).toEqual([...mainWelcome, "visitor@tyulkin ~ ❯ "]);
  });

  it("runs a command", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}");
    expect(getLogs()).toContain("visitor@tyulkin ~ ❯ about");
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
    expect(getLogs()).toContain("visitor@tyulkin ~ ❯ https://example.com");
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

  describe("completion menu (TASK-88)", () => {
    const getMenu = () => screen.queryByRole("listbox", { name: eng.completionsLabel });
    const getSelected = () =>
      screen.queryAllByRole("option", { selected: true }).map((option) => option.id);

    it("lists the options with the descriptions of their commands", async () => {
      const { user, input } = renderConsole();
      await user.keyboard("ex{Tab}");
      const options = within(getMenu()!).getAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([
        `experience-- ${eng.helpExperience}`,
        `exit-- ${eng.helpExit}`,
      ]);
      expect(input.getAttribute("aria-controls")).toBe(getMenu()!.id);
      // nothing is selected until the next Tab or arrow
      expect(getSelected()).toEqual([]);
      expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    });

    it("selects by arrows and Tab, Enter accepts without running", async () => {
      const { user, input } = renderConsole();
      await user.keyboard("ex{Tab}{ArrowDown}");
      expect(input.value).toBe("experience");
      const [experience, exit] = within(getMenu()!).getAllByRole("option");
      expect(getSelected()).toEqual([experience.id]);
      expect(input.getAttribute("aria-activedescendant")).toBe(experience.id);

      await user.keyboard("{ArrowDown}");
      expect(input.value).toBe("exit");
      expect(input.getAttribute("aria-activedescendant")).toBe(exit.id);
      // the selection wraps around both ways
      await user.keyboard("{Tab}");
      expect(input.value).toBe("experience");
      await user.keyboard("{ArrowUp}");
      expect(input.value).toBe("exit");
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(input.value).toBe("experience");

      const logsCount = getLogs().length;
      await user.keyboard("{Enter}");
      expect(input.value).toBe("experience");
      expect(getMenu()).toBeNull();
      expect(input.hasAttribute("aria-activedescendant")).toBe(false);
      expect(getLogs()).toHaveLength(logsCount);

      // the menu is closed: the next Enter runs the line
      await user.keyboard("{Enter}");
      expect(getLogs().length).toBeGreaterThan(logsCount);
    });

    it("Esc puts the typed line back, typing closes the menu", async () => {
      const { user, input } = renderConsole();
      await user.keyboard("ex{Tab}{Tab}{Escape}");
      expect(input.value).toBe("ex");
      expect(getMenu()).toBeNull();

      await user.keyboard("{Tab}{Tab}p");
      expect(input.value).toBe("experiencep");
      expect(getMenu()).toBeNull();
    });

    it("closes when the line is replaced from elsewhere", async () => {
      const { user, input } = renderConsole();
      await user.keyboard("help{Enter}ex{Tab}{ArrowDown}");
      expect(getMenu()).not.toBeNull();
      // history by Ctrl+↑ swaps the line: the options no longer match it
      await user.keyboard("{Control>}{ArrowUp}{/Control}");
      expect(input.value).toBe("help");
      expect(getMenu()).toBeNull();
      expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    });

    it("a click on an option puts it in the line", async () => {
      const { user, input } = renderConsole();
      await user.keyboard("ex{Tab}");
      await user.click(within(getMenu()!).getByRole("option", { name: /^exit/ }));
      expect(input.value).toBe("exit");
      expect(getMenu()).toBeNull();
      expect(document.activeElement).toBe(input);
    });
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

describe("lazy commands (TASK-105)", () => {
  it("print into their own block once their chunk is loaded, through a pipe too", async () => {
    const { user } = renderConsole();
    await user.keyboard("changelog{Enter}figlet hi | lolcat{Enter}");
    await waitFor(() => expect(screen.getByRole("img", { name: "hi" })).toBeTruthy());
    const logs = getLogs();
    const changelog = logs.indexOf("visitor@tyulkin ~ ❯ changelog");
    // the header and the table of the changes, then the next command
    expect(logs[changelog + 1]).toBe(t({ key: "changelogAll", args: { total: "2" } }));
    expect(logs[changelog + 3]).toBe("visitor@tyulkin ~ ❯ figlet hi | lolcat");
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

describe("font (TASK-83)", () => {
  const rootStyle = () => document.documentElement.style;
  const fonts = getParamsString(fontModes);
  const limits = { min: String(FONT_SIZE_MIN), max: String(FONT_SIZE_MAX) };

  it("shows, sets and keeps the font, IBM Plex Mono standing in while it loads", async () => {
    const { user } = renderConsole("/settings");
    expect(rootStyle().getPropertyValue("--terminal-font-family")).toBe(
      '"IBM Plex Mono", monospace',
    );
    await user.keyboard("set font{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "fontStatus", args: { font: "IBM Plex Mono", fonts } }));

    await user.keyboard("set font Fira-Code{Enter}");
    await waitFor(() =>
      expect(getLogs().at(-1)).toBe(t({ key: "changeFont", args: { font: "Fira Code" } })),
    );
    expect(localStorage.getItem("fontMode")).toBe("fira-code");
    expect(rootStyle().getPropertyValue("--terminal-font-family")).toBe(
      '"Fira Code", "IBM Plex Mono", monospace',
    );
  });

  it("rejects an unknown font", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("set font comic{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "wrongFont", args: { fontName: "comic", fonts } }));
    expect(localStorage.getItem("fontMode")).toBeNull();
  });

  it("sets the font size within the limits and keeps it", async () => {
    const { user } = renderConsole("/settings");
    expect(rootStyle().getPropertyValue("--terminal-font-size")).toBe("16px");
    await user.keyboard("set fontsize{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "fontSizeStatus", args: { size: "16", ...limits } }));

    await user.keyboard("set fontsize 20px{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "changeFontSize", args: { size: "20" } }));
    expect(localStorage.getItem("fontSize")).toBe("20");
    expect(rootStyle().getPropertyValue("--terminal-font-size")).toBe("20px");

    await user.keyboard("set fontsize 99{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "wrongFontSize", args: { size: "99", ...limits } }));
    expect(localStorage.getItem("fontSize")).toBe("20");
  });

  it("takes the stored font and size, and leaves them to the regular view", async () => {
    localStorage.setItem("fontMode", "jetbrains-mono");
    localStorage.setItem("fontSize", "14");
    const { router } = renderConsole("/settings");
    expect(rootStyle().getPropertyValue("--terminal-font-family")).toBe(
      '"JetBrains Mono", "IBM Plex Mono", monospace',
    );
    expect(rootStyle().getPropertyValue("--terminal-font-size")).toBe("14px");
    await act(() => router.navigate("/gui"));
    expect(rootStyle().getPropertyValue("--terminal-font-family")).toBe("");
    expect(rootStyle().getPropertyValue("--terminal-font-size")).toBe("");
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
    await user.keyboard("cd..{Enter}");
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

    expect(getLogs().filter((log) => log === "visitor@tyulkin ~ ❯ about")).toHaveLength(2);
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

describe("autosuggestion (TASK-87)", () => {
  // undefined when nothing is suggested
  const getAutosuggestion = (input: HTMLInputElement) => {
    const parts = input.parentElement?.querySelectorAll(`.${inputStyles.autosuggestion}`) ?? [];
    return parts.length ? Array.from(parts, (part) => part.textContent).join("") : undefined;
  };

  it("shows the latest history entry, then a command, and accepts it with → or End", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("set theme White{Enter}set theme Black{Enter}set");
    expect(getAutosuggestion(input)).toBe(" theme Black");

    await user.keyboard("{ArrowRight}");
    expect(input.value).toBe("set theme Black");
    expect(input.selectionStart).toBe(15);
    expect(getAutosuggestion(input)).toBeUndefined();

    await user.clear(input);
    await user.keyboard("edu");
    expect(getAutosuggestion(input)).toBe("cation");
    await user.keyboard("{End}");
    expect(input.value).toBe("education");
  });

  it("accepts the entry as it was recorded, case included", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("About{Enter}ab");
    expect(getAutosuggestion(input)).toBe("out");
    await user.keyboard("{ArrowRight}");
    expect(input.value).toBe("About");
  });

  it("is hidden when the caret is not at the line end, and arrows move it as usual", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("edu{ArrowLeft}");
    expect(getAutosuggestion(input)).toBeUndefined();

    await user.keyboard("{ArrowRight}");
    expect(input.value).toBe("edu");
    expect(getAutosuggestion(input)).toBe("cation");
  });

  it("does not suggest for an empty line or an unknown prefix", async () => {
    const { user, input } = renderConsole();
    expect(getAutosuggestion(input)).toBeUndefined();
    await user.keyboard("qqq");
    expect(getAutosuggestion(input)).toBeUndefined();
  });
});

describe("highlighting (TASK-86)", () => {
  // the typed chars by their highlight class, e.g. "cat" -> "command"
  const getHighlighted = (input: HTMLInputElement, className: string) =>
    Array.from(input.parentElement?.querySelectorAll(`.${className}`) ?? [])
      .filter((char) => !char.className.includes(inputStyles.autosuggestion))
      .map((char) => char.textContent)
      .join("");

  it("colors the command, arguments and paths of the page; Ctrl+R query is plain", async () => {
    const { user, input } = renderConsole("/settings");
    await user.keyboard("cat ../about.md");
    expect(getHighlighted(input, inputStyles.highlightCommand)).toBe("cat");
    expect(getHighlighted(input, inputStyles.highlightPath)).toBe("../about.md");

    await user.clear(input);
    await user.keyboard("cd nope");
    expect(getHighlighted(input, inputStyles.highlightCommand)).toBe("cd");
    expect(getHighlighted(input, inputStyles.highlightArgument)).toBe("nope");

    await user.clear(input);
    await user.keyboard("about");
    // `about` is a command of the main page only
    expect(getHighlighted(input, inputStyles.highlightUnknown)).toBe("about");

    await user.clear(input);
    await user.keyboard("{Control>}r{/Control}cat");
    expect(getHighlighted(input, inputStyles.highlightCommand)).toBe("");
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
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ about", eng.about]);
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
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ about", eng.about]);
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
    expect(getLogs().at(-2)).toBe("visitor@tyulkin ~ ❯ help");
  });

  it("runs help from the input hint", async () => {
    const { user } = renderConsole();
    const hint = document.querySelector<HTMLElement>(`.${inputStyles.hint}`)!;
    await user.click(within(hint).getByRole("button", { name: "help" }));
    expect(getLogs().at(-2)).toBe("visitor@tyulkin ~ ❯ help");
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
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ projects", eng.projects]);
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

describe("command palette (TASK-90)", () => {
  const queryPalette = () => screen.queryByRole("dialog", { name: eng.paletteLabel });
  const getSearch = () => within(queryPalette()!).getByRole("combobox");
  const getOptions = () =>
    within(queryPalette()!)
      .queryAllByRole("option")
      .map((option) => option.textContent);
  const getSelected = () =>
    within(queryPalette()!)
      .queryAllByRole("option")
      .find((option) => option.getAttribute("aria-selected") === "true");

  it("opens by Ctrl+K, runs the best match by Enter into the history, focus back in the line", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("{Control>}k{/Control}");
    expect(document.activeElement).toBe(getSearch());
    // nothing is selected until something is typed: Enter does nothing
    expect(getSelected()).toBeUndefined();
    await user.keyboard("{Enter}");
    expect(queryPalette()).not.toBeNull();

    await user.keyboard("cont");
    expect(getSelected()?.textContent).toBe(`contacts${eng.helpContacts}`);
    expect(getSearch().getAttribute("aria-activedescendant")).toBe(getSelected()?.id);
    await user.keyboard("{Enter}");
    expect(queryPalette()).toBeNull();
    expect(getLogs().slice(-2)[0]).toBe("visitor@tyulkin ~ ❯ contacts");
    expect(document.activeElement).toBe(input);
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("contacts");
  });

  it("opens on a non-Latin layout by the physical key and closes by Ctrl+K, Esc or a click beside", async () => {
    const { user, input } = renderConsole();
    fireEvent.keyDown(input, { key: "л", code: "KeyK", ctrlKey: true });
    expect(queryPalette()).not.toBeNull();
    await user.keyboard("{Control>}k{/Control}");
    expect(queryPalette()).toBeNull();

    await user.keyboard("{Control>}k{/Control}");
    await user.keyboard("{Escape}");
    expect(queryPalette()).toBeNull();
    expect(document.activeElement).toBe(input);

    await user.keyboard("{Control>}k{/Control}");
    await user.click(queryPalette()!.parentElement!);
    expect(queryPalette()).toBeNull();
  });

  it("keeps the typed keys in the search field, the command line stays as it was", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("he");
    await user.keyboard("{Control>}k{/Control}");
    await user.keyboard("ab");
    expect(getSearch()).toHaveProperty("value", "ab");
    expect(document.activeElement).toBe(getSearch());
    await user.keyboard("{Escape}");
    expect(input.value).toBe("he");
  });

  it("moves the selection by arrows and Tab, runs a clicked option, finds files and descriptions", async () => {
    const { user } = renderConsole();
    await user.click(screen.getByRole("button", { name: eng.paletteOpen }));
    await user.keyboard("about");
    expect(getOptions()[0]).toBe(`about${eng.helpAbout}`);
    expect(getOptions()).toContain(`cat ~/about.md${eng.helpCat}`);
    await user.keyboard("{ArrowDown}");
    expect(getSelected()?.textContent).toBe(getOptions()[1]);
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(getSelected()?.textContent).toBe(getOptions().at(-1));
    await user.keyboard("{Tab}");
    expect(getSelected()?.textContent).toBe(getOptions()[0]);
    expect(document.activeElement).toBe(getSearch());

    await user.clear(getSearch());
    await user.keyboard("zzzz");
    expect(getOptions()).toEqual([]);
    // a click anywhere in the palette keeps the keys in the search field, not in the line beneath
    await user.click(within(queryPalette()!).getByText(eng.paletteEmpty));
    expect(document.activeElement).toBe(getSearch());

    await user.clear(getSearch());
    // a word of the description, not of the command
    await user.keyboard("words");
    expect(getOptions()).toEqual([`about${eng.helpAbout}`]);
    await user.click(within(queryPalette()!).getByRole("option"));
    expect(queryPalette()).toBeNull();
    expect(getLogs().slice(-2)[0]).toBe("visitor@tyulkin ~ ❯ about");
  });

  it("offers the commands of the page", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("{Control>}k{/Control}");
    await user.keyboard("stw");
    expect(getOptions()[0]).toBe(`set theme White${eng.helpSetTheme}`);
  });
});

describe("extra keys (TASK-93)", () => {
  const queryRow = () => screen.queryByRole("group", { name: eng.extraKeysLabel });
  const getKey = (label: string) => within(queryRow()!).getByRole("button", { name: label });

  it("is shown while the input is focused and keeps the focus on taps", async () => {
    const { user, input } = renderConsole();
    expect(
      within(queryRow()!)
        .getAllByRole("button")
        .map((key) => key.textContent),
    ).toEqual(EXTRA_KEYS.map(({ label }) => label));
    await user.click(getKey("Esc"));
    expect(document.activeElement).toBe(input);

    act(() => input.blur());
    expect(queryRow()).toBeNull();
    act(() => input.focus());
    expect(queryRow()).not.toBeNull();
  });

  it("presses Tab and arrows as the physical keys", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("help{Enter}about{Enter}");
    await user.click(getKey("↑"));
    expect(input.value).toBe("about");
    await user.click(getKey("↑"));
    expect(input.value).toBe("help");
    await user.click(getKey("↓"));
    expect(input.value).toBe("about");

    await user.clear(input);
    await user.keyboard("edu");
    await user.click(getKey("Tab"));
    expect(input.value).toBe("education");
  });

  it("moves the caret by ← and →, types | and / at the caret", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("ab");
    await user.click(getKey("←"));
    await user.click(getKey("←"));
    await user.click(getKey("→"));
    expect(input.selectionStart).toBe(1);
    await user.click(getKey("|"));
    expect(input.value).toBe("a|b");
    expect(input.selectionStart).toBe(2);
    // the drawn caret follows: the next char goes after the inserted one
    await user.click(getKey("/"));
    expect(input.value).toBe("a|/b");
    expect(input.parentElement?.textContent).toContain("a|/b");
  });

  it("→ accepts the autosuggestion, Esc cancels Ctrl+R search", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("education{Enter}edu");
    await user.click(getKey("→"));
    expect(input.value).toBe("education");

    await user.clear(input);
    await user.keyboard("{Control>}r{/Control}edu");
    expect(screen.getByText("': education")).toBeTruthy();
    await user.click(getKey("Esc"));
    expect(screen.queryByText("': education")).toBeNull();
  });

  it("Ctrl applies to the next key of the row, then turns off", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("help{Enter}");
    await user.click(getKey("Ctrl"));
    expect(getKey("Ctrl").getAttribute("aria-pressed")).toBe("true");
    // Ctrl+/ does nothing, as on a physical keyboard
    await user.click(getKey("/"));
    expect(input.value).toBe("");
    expect(getKey("Ctrl").getAttribute("aria-pressed")).toBe("false");
    await user.click(getKey("↑"));
    expect(input.value).toBe("help");
  });

  it("Ctrl with a char of the virtual keyboard is a shortcut, not a char", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("ls");
    await user.click(getKey("Ctrl"));
    // a preventable beforeinput: the char is not typed
    act(() => {
      input.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: "c",
        }),
      );
    });
    expect(getLogs().at(-1)).toBe("visitor@tyulkin ~ ❯ ls^C");
    expect(input.value).toBe("");
    expect(getKey("Ctrl").getAttribute("aria-pressed")).toBe("false");

    // an IME composition can't be prevented: the typed char is taken back
    await user.keyboard("ls");
    await user.click(getKey("Ctrl"));
    act(() => {
      input.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          inputType: "insertCompositionText",
          data: "l",
        }),
      );
      input.setRangeText("l", 2, 2, "end");
      input.dispatchEvent(
        new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: "l" }),
      );
    });
    expect(input.value).toBe("ls");
    // Ctrl+L cleared the screen, the line stays
    expect(getLogs()).toEqual([]);
  });

  it("Ctrl takes a char of a Russian keyboard by its key, a paste or an IME deletion is not a shortcut", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("ls");
    await user.click(getKey("Ctrl"));
    const beforeInput = (inputType: string, data: string) =>
      new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType, data });
    // a pasted text is not a typed char: it is inserted and uses up Ctrl, as other keys do
    const paste = beforeInput("insertFromPaste", "git");
    act(() => {
      input.dispatchEvent(paste);
    });
    expect(paste.defaultPrevented).toBe(false);
    expect(getKey("Ctrl").getAttribute("aria-pressed")).toBe("false");

    // a composed word shrinks by Backspace: not a typed char either
    act(() => {
      input.dispatchEvent(new CompositionEvent("compositionstart"));
      input.dispatchEvent(beforeInput("insertCompositionText", "ab"));
    });
    await user.click(getKey("Ctrl"));
    const deletion = beforeInput("insertCompositionText", "a");
    act(() => {
      input.dispatchEvent(deletion);
    });
    expect(deletion.defaultPrevented).toBe(false);
    expect(getKey("Ctrl").getAttribute("aria-pressed")).toBe("false");

    await user.click(getKey("Ctrl"));

    // "с" is on the key of the Latin C
    act(() => {
      input.dispatchEvent(beforeInput("insertText", "с"));
    });
    expect(getLogs().at(-1)).toBe("visitor@tyulkin ~ ❯ ls^C");
  });

  it("Ctrl turns off when the input loses the focus", async () => {
    const { user, input } = renderConsole();
    await user.click(getKey("Ctrl"));
    act(() => input.blur());
    act(() => input.focus());
    expect(getKey("Ctrl").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("readline keys (TASK-91)", () => {
  const queryPalette = () => screen.queryByRole("dialog", { name: eng.paletteLabel });
  const ctrl = (letter: string) => `{Control>}${letter}{/Control}`;

  it("moves the caret and edits the line as bash does", async () => {
    const { user, input } = renderConsole();
    await user.keyboard(`cat ~/projects/readme${ctrl("a")}`);
    expect(input.selectionEnd).toBe(0);
    await user.keyboard("{Alt>}f{/Alt}");
    expect(input.selectionEnd).toBe(3);
    await user.keyboard(ctrl("e"));
    expect(input.selectionEnd).toBe(input.value.length);
    await user.keyboard("{Alt>}b{/Alt}{Alt>}b{/Alt}");
    expect(input.value).toBe("cat ~/projects/readme");
    expect(input.selectionEnd).toBe("cat ~/".length);

    await user.keyboard(ctrl("k"));
    expect(input.value).toBe("cat ~/");
    expect(queryPalette()).toBeNull();
    await user.keyboard(ctrl("w"));
    expect(input.value).toBe("cat ");
    await user.keyboard(`about.md{ArrowLeft}{ArrowLeft}${ctrl("u")}`);
    expect(input.value).toBe("md");
    expect(input.selectionEnd).toBe(0);
    await user.keyboard(ctrl("d"));
    expect(input.value).toBe("d");
    expect(input.selectionEnd).toBe(0);
  });

  it("leaves Ctrl+K with nothing after the caret to the palette", async () => {
    const { user, input } = renderConsole();
    await user.keyboard(`he${ctrl("k")}`);
    expect(queryPalette()).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(input.value).toBe("he");
  });

  it("accepts the Ctrl+R match by Ctrl+A or Ctrl+E, the caret at its start or end", async () => {
    const { user, input } = renderConsole();
    await user.keyboard(`education{Enter}{Control>}r{/Control}edu${ctrl("a")}`);
    expect(input.value).toBe("education");
    expect(input.selectionEnd).toBe(0);
    await user.keyboard(`{Control>}r{/Control}edu${ctrl("e")}`);
    expect(input.value).toBe("education");
    expect(input.selectionEnd).toBe("education".length);
  });

  it("accepts the autosuggestion by Ctrl+E", async () => {
    const { user, input } = renderConsole();
    await user.keyboard(`about{Enter}ab${ctrl("e")}`);
    expect(input.value).toBe("about");
  });

  it("ends the session by Ctrl+D on an empty line", async () => {
    const { user } = renderConsole();
    await user.keyboard(ctrl("d"));
    await waitFor(() => expect(screen.queryByText(eng.processCompleted)).toBeTruthy());
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
    expect(getLogs().at(-1)).toBe("visitor@tyulkin ~ ❯ draft^C");

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

    expect(getLogs().at(-2)).toBe("visitor@tyulkin ~ ❯ about");
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
      "visitor@tyulkin ~ ❯ about",
      eng.about,
      "visitor@tyulkin ~ ❯ gui",
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
      expect(getLogs()).toEqual([...mainWelcome, "visitor@tyulkin ~ ❯ about", eng.about]),
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
        "visitor@tyulkin ~/settings ❯ show themes",
        [eng.themeList, ...themeModes].join("\n"),
      ]),
    );
  });

  it("does not leave the link in the history when the command navigates", async () => {
    const { router } = renderConsole("/?cmd=settings");
    await waitFor(() => expect(router.state.location.pathname).toBe("/settings"));
    await act(() => router.navigate(-1));
    expect(router.state.location).toMatchObject({ pathname: "/", search: "" });
    expect(getLogs().filter((log) => log === "visitor@tyulkin ~ ❯ settings")).toHaveLength(1);
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

describe("screensaver (TASK-95)", () => {
  beforeEach(() => {
    // jsdom has no canvas: nothing is drawn, the overlay works without it
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const queryScreensaver = () => screen.queryByText(eng.overlayExit);

  it("covers the page by screensaver, any key closes it and is not typed", async () => {
    const { user, input } = renderConsole("/settings");
    await user.keyboard("screensaver pipes{Enter}");
    expect(queryScreensaver()).toBeTruthy();
    await user.keyboard("x");
    expect(queryScreensaver()).toBeNull();
    expect(input.value).toBe("");
    // any of them without an argument
    await user.keyboard("screensaver{Enter}");
    expect(queryScreensaver()).toBeTruthy();
  });

  it("tells the names on a wrong one", async () => {
    const { user } = renderConsole("/settings");
    await user.keyboard("screensaver toasters{Enter}");
    expect(queryScreensaver()).toBeNull();
    const wrong = t({
      key: "wrongScreensaver",
      args: { screensaverName: "toasters", screensavers: getParamsString(screensaverIds) },
    });
    expect(getLogs().at(-1)).toBe(wrong);
  });

  describe("after a while without input", () => {
    let visibilityState: DocumentVisibilityState;
    beforeEach(() => {
      vi.useFakeTimers();
      // no reduced motion
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      visibilityState = "visible";
      vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilityState);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("starts after the delay, input starts the wait over", () => {
      renderConsole("/settings");
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS - 1000));
      fireEvent.pointerMove(document.body);
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS - 1000));
      fireEvent.keyDown(document.body, { key: "a" });
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS - 1000));
      expect(queryScreensaver()).toBeNull();

      act(() => vi.advanceTimersByTime(1000));
      expect(queryScreensaver()).toBeTruthy();
      // the key closes it and goes no further; the wait starts over
      fireEvent.keyDown(document.body, { key: "a" });
      expect(queryScreensaver()).toBeNull();
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS));
      expect(queryScreensaver()).toBeTruthy();
    });

    it("does not start over a log being typed out", () => {
      renderConsole("/settings");
      // the boot is typed out (no reduced motion) and jsdom never ends its animations
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS * 2));
      expect(queryScreensaver()).toBeNull();
      // a key shows it in full
      fireEvent.keyDown(document.body, { key: "a" });
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS));
      expect(queryScreensaver()).toBeTruthy();
    });

    it("does not start in a hidden tab, the tab shown again starts the wait over", () => {
      renderConsole("/settings");
      // a key shows the boot in full: nothing is typed out
      fireEvent.keyDown(document.body, { key: "a" });
      visibilityState = "hidden";
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS * 3));
      expect(queryScreensaver()).toBeNull();
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS / 2));
      visibilityState = "visible";
      fireEvent(document, new Event("visibilitychange"));
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS - 1000));
      expect(queryScreensaver()).toBeNull();
      act(() => vi.advanceTimersByTime(1000));
      expect(queryScreensaver()).toBeTruthy();
    });

    it("does not start with reduced motion", () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true }));
      renderConsole("/settings");
      act(() => vi.advanceTimersByTime(SCREENSAVER_DELAY_MS * 2));
      expect(queryScreensaver()).toBeNull();
    });
  });
});

describe("exit (TASK-98)", () => {
  const queryCompleted = () => screen.queryByText(eng.processCompleted);
  const getRestart = () => screen.getByRole("button", { name: eng.processRestart });

  it("turns the terminal off at once with reduced motion, restart greets on a cleared console", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}exit{Enter}");
    // the Enter that ran it doesn't press the restart
    await waitFor(() => expect(queryCompleted()).toBeTruthy());
    expect(screen.queryByRole("textbox")).toBeNull();
    // Enter presses the focused restart
    expect(document.activeElement).toBe(getRestart());
    await user.keyboard("{Enter}");
    expect(queryCompleted()).toBeNull();
    expect(getLogs()).toEqual(mainWelcome);
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });

  it("leaving the page turns the terminal on", async () => {
    const { user, router } = renderConsole("/settings");
    await user.keyboard("exit{Enter}");
    await waitFor(() => expect(queryCompleted()).toBeTruthy());
    await act(() => router.navigate("/"));
    expect(queryCompleted()).toBeNull();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  describe("with motion", () => {
    beforeEach(() => {
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      sessionStorage.setItem("guiOffered", "true");
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("the screen goes out, then restart is a new login with the boot", () => {
      const { input } = renderConsole("/settings");
      // shows the boot in full
      fireEvent.keyDown(input, { key: "a" });
      fireEvent.change(input, { target: { value: "exit" } });
      fireEvent.keyDown(input, { key: "Enter" });
      const page = document.querySelector(`.${pageStyles.shuttingDown}`) as HTMLElement;
      expect(page).toBeTruthy();
      // nothing is typed or clicked while it goes out
      expect(page.inert).toBe(true);
      act(() => vi.advanceTimersByTime(SHUTDOWN_MS - 1));
      expect(queryCompleted()).toBeNull();
      act(() => vi.advanceTimersByTime(1));
      expect(queryCompleted()).toBeTruthy();

      fireEvent.click(getRestart());
      for (let i = 0; i < 20; i++) act(() => vi.advanceTimersByTime(1000));
      expect(getLogs()[0]).toMatch(/^Last login: /);
      expect(getLogs().at(-1)).toBe(eng.settingsWelcome);
      expect(document.querySelector(`.${pageStyles.shuttingDown}`)).toBeNull();
    });
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

  const queryMatrix = () => screen.queryByText(eng.overlayExit);

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
    expect(getLogs().at(-1)).toBe(t({ key: "secretTheme", args: { themeName: "Amber" } }));
    // the code is one of the secrets (TASK-63)
    expect(getToast()).toBe(achievement(eng.secretKonami, 1));
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

describe("theme previews (TASK-84)", () => {
  it("shows the themes with their colors, a click sets one", async () => {
    const appDispatch = vi.fn();
    const { user } = renderConsole("/settings", appDispatch);
    await user.keyboard("show themes{Enter}");
    // the strip is drawn in the colors of its own theme and is not part of the name
    const nord = await screen.findByRole("button", { name: "Nord" });
    expect(nord.querySelector('[data-theme="Nord"][aria-hidden="true"]')).not.toBeNull();
    await user.click(nord);
    expect(appDispatch).toHaveBeenCalledWith(setTheme("Nord"));
    expect(localStorage.getItem("themeMode")).toBe("Nord");
  });

  it("previews the theme selected in the completion menu, the set one is back once it closes", async () => {
    const appDispatch = vi.fn();
    const { user, input } = renderConsole("/settings", appDispatch);
    await user.type(input, "set theme {Tab}");
    expect(appDispatch).not.toHaveBeenCalled();
    await user.keyboard("{Tab}");
    expect(appDispatch).toHaveBeenLastCalledWith(setPreviewTheme("White"));
    await user.keyboard("{Tab}");
    expect(appDispatch).toHaveBeenLastCalledWith(setPreviewTheme("Black"));
    await user.keyboard("{Escape}");
    expect(appDispatch).toHaveBeenLastCalledWith(setPreviewTheme(null));
    // only previewed: neither set nor saved
    expect(appDispatch).not.toHaveBeenCalledWith(setTheme("White"));
    expect(localStorage.getItem("themeMode")).toBeNull();
  });

  it("keeps the preview of an accepted option until it runs: the theme doesn't flick back", async () => {
    const appDispatch = vi.fn();
    const { user, input } = renderConsole("/settings", appDispatch);
    await user.type(input, "set theme {Tab}{Tab}{Enter}");
    expect(input.value).toBe("set theme White");
    expect(appDispatch).toHaveBeenLastCalledWith(setPreviewTheme("White"));
    await user.keyboard("{Enter}");
    const calls = appDispatch.mock.calls.map(([action]) => action);
    const setIndex = calls.findIndex((action) => action.type === setTheme("White").type);
    expect(calls.slice(setIndex)).toEqual([setTheme("White"), setPreviewTheme(null)]);
  });

  it("does not preview random", async () => {
    const appDispatch = vi.fn();
    const { user, input } = renderConsole("/settings", appDispatch);
    await user.type(input, "set theme {Tab}{Shift>}{Tab}{/Shift}");
    expect(input.value).toBe("set theme random");
    expect(appDispatch).not.toHaveBeenCalled();
  });
});

describe("easter eggs (TASK-63)", () => {
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
    expect(getLogs().at(-1)).toBe(eng.sudo);
    expect(getToast()).toBe(achievement("sudo", 1));
    await user.keyboard("SUDO{Enter}");
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~/settings ❯ SUDO", eng.sudo]);
    expect(JSON.parse(localStorage.getItem("foundSecrets")!)).toEqual(["sudo"]);
  });

  it("shows the contacts on sudo hire-me", async () => {
    const { user } = renderConsole();
    await user.keyboard("sudo hire-me{Enter}");
    expect(getLogs().slice(-2)).toEqual([eng.sudoHireMe, eng.contacts]);
    expect(getToast()).toBe(achievement("sudo hire-me", 1));
  });

  it("exits vim", async () => {
    const { user } = renderConsole();
    await user.keyboard("vim{Enter}");
    expect(getLogs().at(-1)).toBe(t({ key: "vim", args: { quit: ":q", forceQuit: ":q!" } }));
    expect(getToast()).toBe(achievement("vim", 1));
    await user.click(screen.getByRole("button", { name: ":q!" }));
    expect(getLogs().at(-1)).toBe(eng.vimExit);
    // a newer toast replaces the shown one
    expect(getToast()).toBe(achievement(":q", 2));
  });

  it("puts the visitor's text into the cow's bubble", async () => {
    const { user } = renderConsole();
    await user.keyboard("cowsay hello   world{Enter}");
    expect(getLogs().at(-1)).toContain("< hello world >");
  });

  it("takes extra words after sudo hire-me and rm -rf /", async () => {
    const { user } = renderConsole();
    await user.keyboard("sudo hire-me please{Enter}");
    expect(getLogs().at(-2)).toBe(eng.sudoHireMe);
    await user.keyboard("rm -rf / --no-preserve-root{Enter}");
    expect(getLogs().at(-1)).toBe(eng.rmRfJoke);
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

  it("hides the toast after a while and shows none for a secret found before (TASK-97)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { user } = renderConsole();
      await user.keyboard("fortune{Enter}");
      expect(getToast()).toBe(achievement("fortune", 1));
      // another page shows it on, for the rest of its time
      await user.keyboard("cd projects{Enter}");
      await screen.findByText(eng.projectsWelcome);
      expect(getToast()).toBe(achievement("fortune", 1));
      act(() => vi.advanceTimersByTime(ACHIEVEMENT_TOAST_MS));
      expect(getToast()).toBe("");
      await user.keyboard("fortune{Enter}");
      expect(getToast()).toBe("");
    } finally {
      vi.useRealTimers();
    }
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
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ !!", eng.historyNotFound]);

    await user.keyboard("about{Enter}!!{Enter}");
    expect(getLogs().slice(-3)).toEqual(["visitor@tyulkin ~ ❯ !!", "about", eng.about]);
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
    await waitFor(() => expect(getLogs()).toContain("visitor@tyulkin ~ ❯ echo hired"));
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
    expect(getLogs().at(-1)).toBe("visitor@tyulkin ~/settings ❯ echo one two | grep TWO");

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
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ skills", eng.skills]);
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
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ cat ~/about.md", eng.about]);

    input.focus();
    await user.keyboard("ls projects/{Enter}");
    expect(getLogs().at(-1)).toBe("README.md");
  });

  it("changes the directory with the page, the prompt and pwd", async () => {
    const { user, router } = renderConsole();
    await user.keyboard("cd projects{Enter}");
    expect(router.state.location.pathname).toBe("/projects");
    expect(getLogs().at(-1)).toBe(eng.projectsWelcome);
    // the directory is a segment of the prompt (TASK-81)
    expect(screen.getByText("~/projects")).toBeTruthy();

    await user.keyboard("pwd{Enter}");
    expect(getLogs().slice(-2)).toEqual([
      "visitor@tyulkin ~/projects ❯ pwd",
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
      expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ cat skills.md", eng.skills]),
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

describe("mini-games (TASK-66)", () => {
  const findGame = (name: string) => screen.findByRole("dialog", { name });
  const queryGame = () => screen.queryByRole("dialog");

  it("loads a game over the console, Esc closes it and logs the score", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("snake{Enter}");
    const game = await findGame("snake");
    expect(within(game).getByText(eng.gameHintMove)).toBeTruthy();

    // the keys play: nothing is typed or browsed in the history
    await user.keyboard("{ArrowUp}{ArrowLeft}w");
    expect(input.value).toBe("");
    await user.keyboard("{Escape}");
    expect(queryGame()).toBeNull();
    expect(getLogs().at(-1)).toBe(
      t({ key: "gameResult", args: { game: "snake", score: "0", record: "0" } }),
    );
    // the console works as before
    await user.keyboard("x");
    expect(input.value).toBe("x");
  });

  it("shows the stored record and closes by the exit button", async () => {
    localStorage.setItem("gameRecords", JSON.stringify({ tetris: 50 }));
    const { user } = renderConsole();
    await user.keyboard("tetris{Enter}");
    const game = await findGame("tetris");
    expect(
      within(game).getByText(t({ key: "gameScore", args: { score: "0", record: "50" } })),
    ).toBeTruthy();
    expect(within(game).getByText(eng.gameHintTetris)).toBeTruthy();
    const logsCount = getLogs().length;
    await user.click(within(game).getByRole("button", { name: eng.gameExit }));
    expect(queryGame()).toBeNull();
    expect(getLogs()).toHaveLength(logsCount + 1);
    expect(getLogs().at(-1)).toBe(
      t({ key: "gameResult", args: { game: "tetris", score: "0", record: "50" } }),
    );
  });

  it("keeps a new record of 2048", async () => {
    // every new tile is a 4 in the first empty cell: the two first ones merge to the left
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const { user } = renderConsole();
    await user.keyboard("2048{Enter}");
    await findGame("2048");
    await user.keyboard("{ArrowLeft}{Escape}");
    random.mockRestore();
    const record = JSON.parse(localStorage.getItem("gameRecords") ?? "{}") as { 2048?: number };
    expect(record[2048]).toBe(8);
    expect(getLogs().at(-1)).toBe(
      t({ key: "gameNewRecord", args: { game: "2048", score: String(record[2048]) } }),
    );
  });

  it("keeps the focus in the game: Tab reaches the exit, Enter presses it", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("2048{Enter}");
    const game = await findGame("2048");
    expect(document.activeElement).toBe(game);
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(within(game).getByRole("button", { name: eng.gameExit }));
    await user.keyboard("{Enter}");
    expect(queryGame()).toBeNull();
    // the command line has its focus back
    expect(document.activeElement).toBe(input);
  });

  it("closes the game when the page is left", async () => {
    const { user, router } = renderConsole();
    await user.keyboard("settings{Enter}snake{Enter}");
    await findGame("snake");
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/");
    expect(queryGame()).toBeNull();
  });
});

describe("command blocks (TASK-82)", () => {
  const getEchoes = () =>
    screen.queryAllByRole("listitem").filter((item) => item.classList.contains(logsStyles.echo));
  const getStatus = (item: HTMLElement) =>
    item.querySelector(`.${logsStyles.failed}`)
      ? "failed"
      : item.querySelector(`.${logsStyles.succeeded}`)
        ? "succeeded"
        : undefined;

  it("marks a block by whether its command failed", async () => {
    const { user } = renderConsole();
    await user.keyboard(
      "about{Enter}foo{Enter}cd nowhere{Enter}!!{Enter}help | grep{Enter}read nosuchpost{Enter}",
    );
    expect(getEchoes().map(getStatus)).toEqual([
      "succeeded",
      "failed",
      "failed",
      // !! repeats the failed cd
      "failed",
      "failed",
      "failed",
    ]);
  });

  it("repeats the command of a block on click", async () => {
    const { user } = renderConsole();
    await user.keyboard("about{Enter}help{Enter}");
    await user.click(within(getEchoes()[0]).getByRole("button", { name: "about" }));
    expect(getLogs().slice(-2)).toEqual(["visitor@tyulkin ~ ❯ about", eng.about]);
    expect(getEchoes()).toHaveLength(3);
  });
});

describe("gestures (TASK-94)", () => {
  const touch = (x: number, y: number) => ({ clientX: x, clientY: y });
  const getPrompt = (input: HTMLInputElement) => input.closest(`.${inputStyles.wrapper}`)!;

  it("browses the history by a vertical swipe over the prompt", async () => {
    const { user, input } = renderConsole();
    await user.keyboard("about{Enter}education{Enter}dra");
    const swipe = (fromY: number, toY: number, toX = 100) => {
      fireEvent.touchStart(getPrompt(input), { touches: [touch(100, fromY)] });
      fireEvent.touchEnd(getPrompt(input), {
        touches: [],
        changedTouches: [touch(toX, toY)],
      });
    };

    swipe(200, 150);
    expect(input.value).toBe("education");
    swipe(200, 150);
    expect(input.value).toBe("about");
    // too short, or more across than along: not a swipe
    swipe(200, 190);
    swipe(200, 150, 200);
    expect(input.value).toBe("about");
    swipe(150, 200);
    swipe(150, 200);
    expect(input.value).toBe("dra");
  });

  it("sets the font size by a pinch over the console and keeps it once the fingers are lifted", () => {
    renderConsole("/settings");
    const console = document.querySelector(`.${pageStyles.wrapper}`)!;
    const fontSize = () => document.documentElement.style.getPropertyValue("--terminal-font-size");

    fireEvent.touchStart(console, { touches: [touch(100, 100), touch(200, 100)] });
    fireEvent.touchMove(console, { touches: [touch(100, 100), touch(225, 100)] });
    expect(fontSize()).toBe("20px");
    expect(localStorage.getItem("fontSize")).toBeNull();
    // no further than the limits of `set fontsize`
    fireEvent.touchMove(console, { touches: [touch(100, 100), touch(500, 100)] });
    expect(fontSize()).toBe(`${FONT_SIZE_MAX}px`);
    fireEvent.touchEnd(console, { touches: [touch(100, 100)] });
    expect(localStorage.getItem("fontSize")).toBe(String(FONT_SIZE_MAX));

    fireEvent.touchStart(console, { touches: [touch(100, 100), touch(200, 100)] });
    fireEvent.touchMove(console, { touches: [touch(100, 100), touch(110, 100)] });
    fireEvent.touchEnd(console, { touches: [] });
    expect(fontSize()).toBe(`${FONT_SIZE_MIN}px`);
    expect(localStorage.getItem("fontSize")).toBe(String(FONT_SIZE_MIN));
  });

  describe("long tap", () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    const press = (target: Element, ms: number) => {
      const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, ...touch(10, 10) };
      fireEvent.pointerDown(target, pointer);
      act(() => vi.advanceTimersByTime(ms));
      fireEvent.pointerUp(target, pointer);
      fireEvent.click(target);
    };

    it("copies the block of a command and doesn't press what is under the finger", async () => {
      const { user } = renderConsole("/settings");
      await user.keyboard("show themes{Enter}show languages{Enter}");
      const languages = getLogs().at(-1)!;
      const writeText = vi.spyOn(navigator.clipboard, "writeText");
      const themeButton = screen.getByRole("button", { name: "Nord" });

      press(themeButton, LONG_PRESS_MS);
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      const [text] = writeText.mock.calls[0];
      expect(text.startsWith(`visitor@tyulkin ~/settings ❯ show themes\n${eng.themeList}\n`)).toBe(
        true,
      );
      expect(text).toContain("Nord");
      expect(text).not.toContain(languages);
      // the theme was not set, the status is told over the block for a while
      expect(getLogs().at(-1)).toBe(languages);
      await screen.findByText(eng.blockCopied);
      act(() => vi.advanceTimersByTime(COPY_STATUS_MS));
      expect(screen.queryByText(eng.blockCopied)).toBeNull();
    });

    it("tells a failed copy, and a short tap stays a click", async () => {
      const { user } = renderConsole("/settings");
      await user.keyboard("show themes{Enter}");
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
      press(screen.getAllByRole("listitem").at(-1)!, LONG_PRESS_MS);
      await screen.findByText(eng.blockNotCopied);

      press(screen.getByRole("button", { name: "Nord" }), LONG_PRESS_MS / 2);
      expect(getLogs().at(-1)).toBe(t({ key: "changeTheme", args: { themeName: "Nord" } }));
    });

    it("gives the press up when the browser takes the touch or another finger comes", async () => {
      const { user } = renderConsole("/settings");
      await user.keyboard("show themes{Enter}");
      const writeText = vi.spyOn(navigator.clipboard, "writeText");
      const log = screen.getAllByRole("listitem").at(-1)!;
      const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true };

      fireEvent.pointerDown(log, pointer);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      expect(log.className).toContain(logsStyles.marked);
      fireEvent.pointerCancel(log, pointer);
      expect(log.className).not.toContain(logsStyles.marked);

      fireEvent.pointerDown(log, pointer);
      fireEvent.pointerDown(document.body, { ...pointer, pointerId: 2, isPrimary: false });
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      fireEvent.pointerUp(log, pointer);
      expect(writeText).not.toHaveBeenCalled();
    });
  });

  describe("vibration on an error", () => {
    const vibrate = vi.fn();
    beforeEach(() => {
      vibrate.mockClear();
      Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    });
    afterEach(() => {
      Reflect.deleteProperty(navigator, "vibrate");
    });

    it("buzzes on a failed command with set sound on only", async () => {
      vi.stubGlobal("AudioContext", undefined);
      const { user } = renderConsole("/settings");
      await user.keyboard("nope{Enter}");
      expect(vibrate).not.toHaveBeenCalled();

      await user.keyboard("set sound on{Enter}show themes{Enter}");
      expect(vibrate).not.toHaveBeenCalled();
      await user.keyboard("nope{Enter}");
      expect(vibrate).toHaveBeenCalledTimes(1);
    });
  });
});
