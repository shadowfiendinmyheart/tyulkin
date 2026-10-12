import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ConsoleContext } from "../../context/consoleContext";
import { CaretMode } from "../../domain";
import { LogNode } from "../../store/console/interfaces";
import Logs from ".";
import styles from "./styles.module.scss";

const renderLog = (content: LogNode[]) => {
  render(
    <ConsoleContext.Provider
      value={{
        consoleState: {
          logs: [{ id: 0, content }],
          nextLogId: 1,
          history: [],
          caretMode: CaretMode.Block,
          commandsHint: [],
        },
        consoleDispatch: () => undefined,
      }}
    >
      <Logs />
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
    expect(screen.getByText("help").className).toBe(styles.command);
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
    expect(screen.getByText("about").className).toBe(styles.command);
  });

  it("keeps a pre block as is", () => {
    const log = renderLog([{ type: "pre", text: " /\\_/\\\n( o.o )" }]);
    const pre = log.querySelector("pre");
    expect(pre?.className).toBe(styles.pre);
    expect(pre?.textContent).toBe(" /\\_/\\\n( o.o )");
  });
});
