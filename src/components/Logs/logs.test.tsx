import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ConsoleContext } from "../../context/consoleContext";
import { HandlerContext } from "../../context/handlerContext";
import { LocalizationContext } from "../../context/localizationContext";
import { createT } from "../../localization";
import eng from "../../localization/dictionaries/eng.json";
import { CaretMode } from "../../domain";
import { Log, LogNode } from "../../store/console/interfaces";
import Logs from ".";
import styles from "./styles.module.scss";
import commandStyles from "../CommandButton/styles.module.scss";

const executeCommand = vi.fn();
const t = createT(eng);

const renderLogs = (logs: Log[]) =>
  render(
    <ConsoleContext.Provider
      value={{
        consoleState: {
          logs,
          nextLogId: logs.length,
          typedLogId: logs.length,
          history: [],
          historyAdded: 0,
          typedCommandsCount: 0,
          caretMode: CaretMode.Block,
          crtMode: "off",
          soundMode: "off",
          fontMode: "ibm-plex-mono",
          fontSize: 16,
          commandsHint: [],
          overlay: null,
          game: null,
          achievement: null,
          shutdown: null,
          route: null,
        },
        consoleDispatch: () => undefined,
      }}
    >
      <HandlerContext.Provider
        value={{
          executeCommand,
          allCommands: [],
          describeCompletion: () => undefined,
          highlight: () => [],
          paletteEntries: [],
        }}
      >
        <LocalizationContext.Provider
          value={{ language: "eng", t, changeLanguage: () => Promise.resolve(t) }}
        >
          <Logs />
        </LocalizationContext.Provider>
      </HandlerContext.Provider>
    </ConsoleContext.Provider>,
  );

const renderLog = (content: LogNode[]) => {
  renderLogs([{ id: 0, content }]);
  return screen.getByRole("listitem");
};

afterEach(cleanup);

describe("rich logs (TASK-56)", () => {
  it("renders text, colored text, links and commands in a row", () => {
    const log = renderLog([
      "plain ",
      { type: "text", text: "error", color: "error" },
      " ",
      { type: "link", text: "site", href: "https://example.com" },
      " ",
      { type: "command", command: "help" },
    ]);
    expect(log.textContent).toBe("plain error site help");
    expect(screen.getByText("error").className).toBe(styles.error);
    expect(screen.getByRole("link", { name: "site" }).getAttribute("rel")).toBe("noreferrer");
    expect(screen.getByRole("button", { name: "help" }).className).toBe(commandStyles.command);
  });

  it("renders tables with nodes in cells", () => {
    renderLog([
      {
        type: "table",
        rows: [
          [[{ type: "command", command: "about" }], ["about me"]],
          [["ls"], ["list"]],
        ],
      },
    ]);
    const rows = screen.getAllByRole("row") as HTMLTableRowElement[];
    expect(rows.map((row) => Array.from(row.cells, (cell) => cell.textContent))).toEqual([
      ["about", "about me"],
      ["ls", "list"],
    ]);
    expect(screen.getByRole("button", { name: "about" }).className).toBe(commandStyles.command);
  });

  it("hides decorative nodes from screen readers (TASK-54)", () => {
    const log = renderLog([
      { type: "pre", text: "|_|", decorative: true },
      { type: "text", text: "███", color: "text", decorative: true },
      { type: "text", text: "key:", color: "accent" },
    ]);
    expect(log.querySelector("pre")?.getAttribute("aria-hidden")).toBe("true");
    expect(log.querySelector("pre")?.classList.contains(styles.art)).toBe(true);
    expect(screen.getByText("███").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("███").className).toBe(styles.text);
    expect(screen.getByText("key:").hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps a pre block as is", () => {
    const log = renderLog([{ type: "pre", text: " /\\_/\\\n( o.o )" }]);
    const pre = log.querySelector("pre");
    expect(pre?.className).toBe(styles.pre);
    expect(pre?.textContent).toBe(" /\\_/\\\n( o.o )");
  });

  it("colors a rainbow pre block by the place of each character (TASK-99)", () => {
    const log = renderLog([{ type: "pre", text: "abc\nd", rainbow: { row: 2, col: 0 } }]);
    const pre = log.querySelector("pre");
    expect(pre?.textContent).toBe("abc\nd");
    const spans = Array.from(pre?.querySelectorAll("span") ?? []);
    expect(spans.map((span) => [span.textContent, span.className])).toEqual([
      ["ab", styles.ansiYellow],
      ["c\n", styles.ansiGreen],
      ["d", styles.ansiYellow],
    ]);
  });

  it("reads the label of an art instead of its characters (TASK-99)", () => {
    const log = renderLog([{ type: "pre", text: "# #", label: "hi" }]);
    const art = within(log).getByRole("img", { name: "hi" });
    expect(art.tagName).toBe("PRE");
  });
});

describe("clickable commands (TASK-55)", () => {
  it("runs a command on click", () => {
    renderLog(["type ", { type: "command", command: "cd .." }]);
    const button = screen.getByRole("button", { name: "cd .." });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(executeCommand).toHaveBeenCalledExactlyOnceWith("cd ..", { route: undefined });
  });

  it("runs a command on the page it was printed on, a table cell too (TASK-103)", () => {
    executeCommand.mockClear();
    renderLogs([
      {
        id: 0,
        route: "/settings",
        content: [
          { type: "command", command: "set theme Nord", label: "Nord" },
          { type: "table", rows: [[[{ type: "command", command: "show themes" }]]] },
        ],
      },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Nord" }));
    fireEvent.click(screen.getByRole("button", { name: "show themes" }));
    expect(executeCommand.mock.calls).toEqual([
      ["set theme Nord", { route: "/settings" }],
      ["show themes", { route: "/settings" }],
    ]);
  });
});

describe("command blocks (TASK-82)", () => {
  const time = new Date(2026, 9, 20, 9, 5, 7).getTime();
  const echo = (input: string, command?: string, failed?: boolean): Log["echo"] => ({
    prompt: "~ ❯",
    input,
    command,
    blockId: 1,
    time,
    failed,
  });

  it("heads a block by the echoed input with its status and time", () => {
    renderLogs([
      { id: 0, content: ["~ ❯ !!"], echo: echo("!!", "about") },
      { id: 1, content: ["about me"] },
      { id: 2, content: ["~ ❯ cd nowhere"], echo: echo("cd nowhere", "cd nowhere", true) },
      { id: 3, content: ["~ ❯ ls^C"], echo: echo("ls^C") },
    ]);
    const [ok, output, failed, dropped] = screen.getAllByRole("listitem");
    // the status and the time are drawn by CSS: the text stays as entered
    expect([ok, output, failed, dropped].map((item) => item.textContent)).toEqual([
      "~ ❯ !!",
      "about me",
      "~ ❯ cd nowhere",
      "~ ❯ ls^C",
    ]);
    expect(ok.className).toContain(styles.echo);
    expect(output.className).not.toContain(styles.echo);
    expect(ok.querySelector(`.${styles.succeeded}`)).not.toBeNull();
    expect(failed.querySelector(`.${styles.failed}`)).not.toBeNull();
    expect(dropped.querySelector(`.${styles.succeeded}, .${styles.failed}`)).toBeNull();
    expect(ok.querySelector(`.${styles.time}`)?.getAttribute("data-time")).toBe("09:05:07");
    // a line that wasn't run can't be repeated
    expect(within(dropped).queryByRole("button")).toBeNull();
  });

  it("runs the command of a block again on click", () => {
    executeCommand.mockClear();
    renderLogs([{ id: 0, content: ["~ ❯ !!"], echo: echo("!!", "about"), route: "/" }]);
    const button = screen.getByRole("button", { name: "!!" });
    // what a click runs, when the input is not it
    expect(button.getAttribute("title")).toBe("about");
    fireEvent.click(button);
    // on the page it was entered on (TASK-103)
    expect(executeCommand).toHaveBeenCalledExactlyOnceWith("about", { route: "/" });
  });
});
