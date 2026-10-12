import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConsoleContext } from "../../context/consoleContext";
import { HandlerContext } from "../../context/handlerContext";
import { CaretMode } from "../../domain";
import { LogNode } from "../../store/console/interfaces";
import Logs from ".";
import styles from "./styles.module.scss";
import commandStyles from "../CommandButton/styles.module.scss";

const executeCommand = vi.fn();

const renderLog = (content: LogNode[]) => {
  render(
    <ConsoleContext.Provider
      value={{
        consoleState: {
          logs: [{ id: 0, content }],
          nextLogId: 1,
          typedLogId: 1,
          history: [],
          typedCommandsCount: 0,
          caretMode: CaretMode.Block,
          commandsHint: [],
          isMatrixShown: false,
        },
        consoleDispatch: () => undefined,
      }}
    >
      <HandlerContext.Provider value={{ executeCommand, allCommands: [] }}>
        <Logs />
      </HandlerContext.Provider>
    </ConsoleContext.Provider>,
  );
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
