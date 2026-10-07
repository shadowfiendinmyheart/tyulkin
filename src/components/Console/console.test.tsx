import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ConsolePage from "../../pages/ConsolePage";
import { AppContext } from "../../context/appContext";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";
import { CaretMode } from "../../domain";

const t = createT(eng);

// jsdom has no layout
Element.prototype.scrollIntoView = () => undefined;

const renderConsole = (path = "/") => {
  render(
    <AppContext.Provider
      value={{
        appState: { status: "ok", theme: "Black" },
        appDispatch: () => undefined,
      }}
    >
      <LocalizationContext.Provider
        value={{ language: "eng", t, changeLanguage: () => Promise.resolve(t) }}
      >
        <MemoryRouter initialEntries={[path]}>
          <ConsolePage />
        </MemoryRouter>
      </LocalizationContext.Provider>
    </AppContext.Provider>,
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
    const chars = Array.from(input.parentElement?.lastElementChild?.children ?? []);
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
