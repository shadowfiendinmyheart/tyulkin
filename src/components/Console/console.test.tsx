import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ConsolePage from "../../pages/ConsolePage";
import { AppContext } from "../../context/appContext";
import localization from "../../localization";

// jsdom has no layout
Element.prototype.scrollIntoView = () => undefined;

const renderConsole = (path = "/") => {
  render(
    <AppContext.Provider
      value={{
        appState: { status: "ok", language: "eng", theme: "Black" },
        appDispatch: () => undefined,
      }}
    >
      <MemoryRouter initialEntries={[path]}>
        <ConsolePage />
      </MemoryRouter>
    </AppContext.Provider>,
  );
  return { user: userEvent.setup(), input: screen.getByRole("textbox") as HTMLInputElement };
};

const getLogs = () => screen.getAllByRole("listitem").map((item) => item.textContent);

beforeAll(async () => {
  await localization.changeDictionary("eng");
});

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
    expect(getLogs()).toContain(localization.getLocale({ key: "about" }));
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
