import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ConsoleContext } from "../../context/consoleContext";
import { HandlerContext } from "../../context/handlerContext";
import { CaretMode } from "../../domain";
import { Log, LogNode } from "../../store/console/interfaces";
import Logs from ".";
import styles from "./styles.module.scss";
import commandStyles from "../CommandButton/styles.module.scss";

const executeCommand = vi.fn();

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
          commandsHint: [],
          isMatrixShown: false,
          game: null,
        },
        consoleDispatch: () => undefined,
      }}
    >
      <HandlerContext.Provider value={{ executeCommand, allCommands: [], highlight: () => [] }}>
        <Logs />
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
});

describe("clickable commands (TASK-55)", () => {
  it("runs a command on click", () => {
    renderLog(["type ", { type: "command", command: "cd .." }]);
    const button = screen.getByRole("button", { name: "cd .." });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(executeCommand).toHaveBeenCalledExactlyOnceWith("cd ..");
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
    renderLogs([{ id: 0, content: ["~ ❯ !!"], echo: echo("!!", "about") }]);
    const button = screen.getByRole("button", { name: "!!" });
    // what a click runs, when the input is not it
    expect(button.getAttribute("title")).toBe("about");
    fireEvent.click(button);
    expect(executeCommand).toHaveBeenCalledExactlyOnceWith("about");
  });
});
