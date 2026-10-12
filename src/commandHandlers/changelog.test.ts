import { describe, expect, it } from "vitest";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import { LogNode } from "../store/console/interfaces";
import { Change, CHANGELOG_LIMIT, changes, getChangelog, parseChanges } from "./changelog";

const t = createT(eng);

const getText = (nodes: LogNode[]): string =>
  nodes
    .map((node) => {
      if (typeof node === "string") return node;
      if (node.type === "command") return node.command;
      if (node.type === "table")
        return node.rows.map((row) => row.map(getText).join(" ")).join("\n");
      return node.text;
    })
    .join("");

describe("parseChanges (TASK-69)", () => {
  it("takes the commits in the [type] format, newest first", () => {
    expect(
      parseChanges([
        { date: "2026-10-13", subject: "[add] changelog command TASK-69" },
        { date: "2026-10-12", subject: "init" },
        {
          date: "2026-10-11",
          subject: "[fix] word boundary TASK-25, dictionary TASK-27",
        },
        { date: "2026-10-10", subject: "[wip] not a change type" },
      ]),
    ).toEqual([
      { date: "2026-10-13", type: "add", description: "changelog command TASK-69" },
      { date: "2026-10-11", type: "fix", description: "word boundary TASK-25, dictionary TASK-27" },
    ]);
  });

  it("reads the history the build put in", () => {
    expect(changes.map(({ type }) => type)).toEqual(["add", "fix"]);
  });
});

describe("getChangelog (TASK-69)", () => {
  const many: Change[] = Array.from({ length: CHANGELOG_LIMIT + 2 }, (_, index) => ({
    date: "2026-10-13",
    type: "refactor",
    description: `change ${index}`,
  }));

  it("lists the latest changes and offers all of them", () => {
    const [header, [table]] = getChangelog(t, many, false);
    expect(getText(header)).toBe(
      `How this site is made, from its git log. Changes: ${many.length}, the latest ${CHANGELOG_LIMIT} below. All of them: changelog --all`,
    );
    expect(header).toContainEqual({ type: "command", command: "changelog --all" });
    expect(table).toMatchObject({ type: "table" });
    const rows = (table as Extract<LogNode, { type: "table" }>).rows;
    expect(rows).toHaveLength(CHANGELOG_LIMIT);
    expect(rows[0]).toEqual([
      [{ type: "text", text: "2026-10-13", color: "muted" }],
      [{ type: "text", text: "[refactor]", color: "text" }],
      ["change 0"],
    ]);
  });

  it("lists every change with --all or when they are few", () => {
    const [allHeader, [allTable]] = getChangelog(t, many, true);
    expect(getText(allHeader)).toBe(
      `How this site is made, from its git log. Changes: ${many.length}`,
    );
    expect(getText([allTable]).split("\n")).toHaveLength(many.length);

    const [fewHeader] = getChangelog(t, many.slice(0, 2), false);
    expect(getText(fewHeader)).toBe("How this site is made, from its git log. Changes: 2");
  });

  it("says so when the build has no history", () => {
    expect(getChangelog(t, [], false)).toEqual([[eng.changelogEmpty]]);
  });
});
