import { describe, expect, it } from "vitest";
import { LogNode } from "../store/console/interfaces";
import {
  expandHistory,
  findHistoryMatch,
  formatHistory,
  getPrompt,
  getWorkingDirectory,
  grep,
  lolcat,
  createPipe,
  PipeStage,
  parsePipeline,
  unquote,
} from "./shell";

describe("getWorkingDirectory (TASK-61)", () => {
  it("maps the pages to the home directory and its subdirectories", () => {
    expect(getWorkingDirectory("/")).toBe("/home/visitor");
    expect(getWorkingDirectory("/settings")).toBe("/home/visitor/settings");
    expect(getWorkingDirectory("/settings/")).toBe("/home/visitor/settings");
  });
});

describe("getPrompt (TASK-60)", () => {
  it("shows the directory of the page from the home", () => {
    expect(getPrompt("/")).toBe("visitor@tyulkin ~ ❯");
    expect(getPrompt("/projects")).toBe("visitor@tyulkin ~/projects ❯");
    expect(getPrompt("/settings/")).toBe("visitor@tyulkin ~/settings ❯");
  });
});

describe("unquote", () => {
  it("drops the quotes of quoted parts", () => {
    expect(unquote('"hello world"')).toBe("hello world");
    expect(unquote("'it'")).toBe("it");
    expect(unquote(`"mixed'`)).toBe(`"mixed'`);
    expect(unquote("no quotes")).toBe("no quotes");
    expect(unquote(`"a" "b"`)).toBe("a b");
    expect(unquote(`"it's" 'x'`)).toBe("it's x");
  });
});

describe("expandHistory", () => {
  it("replaces every !! with the previous command, as is", () => {
    expect(expandHistory("about", undefined)).toBe("about");
    expect(expandHistory("!!", "help")).toBe("help");
    expect(expandHistory("sudo !! !!", "a$&b")).toBe("sudo a$&b a$&b");
  });

  it("finds no event without a previous command", () => {
    expect(expandHistory("!!", undefined)).toBeUndefined();
  });
});

describe("formatHistory", () => {
  it("numbers the commands oldest first", () => {
    expect(formatHistory(["help", "about"])).toBe("    1  about\n    2  help");
  });
});

describe("findHistoryMatch", () => {
  const history = ["help", "Skills", "about"];

  it("finds the newest entry containing the query, case-insensitively", () => {
    expect(findHistoryMatch(history, "l")).toBe(0);
    expect(findHistoryMatch(history, "S")).toBe(1);
    expect(findHistoryMatch(history, "l", 1)).toBe(1);
    expect(findHistoryMatch(history, "l", 2)).toBe(-1);
  });

  it("finds nothing for an empty query", () => {
    expect(findHistoryMatch(history, "")).toBe(-1);
  });
});

describe("parsePipeline", () => {
  it("splits the command and its stages", () => {
    expect(parsePipeline("about")).toEqual({ command: "about", stages: [] });
    expect(parsePipeline("help | grep theme | GREP -i 'set the' | LolCat")).toEqual({
      command: "help",
      stages: [
        { type: "grep", pattern: "theme", ignoreCase: false },
        { type: "grep", pattern: "set the", ignoreCase: true },
        { type: "lolcat" },
      ],
    });
  });

  it("keeps a quoted | in its part", () => {
    expect(parsePipeline('echo "a|b" | grep "|"')).toEqual({
      command: 'echo "a|b"',
      stages: [{ type: "grep", pattern: "|", ignoreCase: false }],
    });
  });

  it("rejects anything but grep with a word or lolcat after |", () => {
    expect(parsePipeline("help | wc")).toBeUndefined();
    expect(parsePipeline("help | grep")).toBeUndefined();
    expect(parsePipeline("help | lolcat -a")).toBeUndefined();
    expect(parsePipeline("help || grep x")).toBeUndefined();
    expect(parsePipeline("| grep x")).toBeUndefined();
    expect(parsePipeline("| lolcat")).toBeUndefined();
  });
});

describe("grep", () => {
  const filter = { pattern: "re", ignoreCase: false };

  it("keeps the lines with the pattern and highlights it", () => {
    const nodes: LogNode[] = [
      "React\nVue\n",
      { type: "text", text: "Redux, more", color: "muted" },
    ];
    expect(grep(nodes, { pattern: "re", ignoreCase: true })).toEqual([
      { type: "text", text: "Re", color: "accent" },
      "act",
      "\n",
      { type: "text", text: "Re", color: "accent" },
      { type: "text", text: "dux, mo", color: "muted" },
      { type: "text", text: "re", color: "accent" },
    ]);
    expect(grep(["React\nVue"], filter)).toEqual([]);
  });

  it("keeps a line with a command or a link as a whole", () => {
    const command: LogNode = { type: "command", command: "help" };
    expect(grep(["type ", command, "\nor not"], { pattern: "help", ignoreCase: false })).toEqual([
      "type ",
      command,
    ]);
  });

  it("takes a row of one-line cells as a line", () => {
    const table: LogNode = {
      type: "table",
      rows: [
        [["set theme"], ["set the theme"]],
        [["ls"], ["list commands"]],
      ],
    };
    expect(grep([table], { pattern: "theme", ignoreCase: false })).toEqual([
      {
        type: "table",
        rows: [
          [
            ["set ", { type: "text", text: "theme", color: "accent" }],
            ["set the ", { type: "text", text: "theme", color: "accent" }],
          ],
        ],
      },
    ]);
  });

  it("searches multiline cells and pre blocks line by line", () => {
    const table: LogNode = {
      type: "table",
      rows: [[[{ type: "pre", text: "#\nre#", decorative: true }], ["a\nre"]]],
    };
    expect(grep([table], filter)).toEqual([
      {
        type: "table",
        rows: [
          [
            [{ type: "pre", text: "re#", decorative: true }],
            [{ type: "text", text: "re", color: "accent" }],
          ],
        ],
      },
    ]);
  });

  it("escapes the pattern", () => {
    expect(grep(["a.b\naxb"], { pattern: ".", ignoreCase: false })).toEqual([
      "a",
      { type: "text", text: ".", color: "accent" },
      "b",
    ]);
  });
});

describe("lolcat (TASK-99)", () => {
  it("colors text in diagonal stripes of the rainbow", () => {
    expect(lolcat(["ab\ncd", { type: "text", text: "ef", color: "error" }]).nodes).toEqual([
      { type: "text", text: "ab\nc", color: "ansi-red" },
      { type: "text", text: "d", color: "ansi-yellow" },
      { type: "text", text: "e", color: "ansi-yellow" },
      { type: "text", text: "f", color: "ansi-green" },
    ]);
  });

  it("keeps commands and links, which still take their columns", () => {
    const command: LogNode = { type: "command", command: "help" };
    expect(lolcat([command, "ab"]).nodes).toEqual([
      command,
      { type: "text", text: "ab", color: "ansi-green" },
    ]);
  });

  it("marks pre blocks rainbow from their place on, but not a QR code or an art", () => {
    const qr: LogNode = { type: "pre", text: "▀▄", qr: true };
    const logo: LogNode = { type: "pre", text: "=^.^=", decorative: true };
    expect(lolcat(["ab", { type: "pre", text: "##\n##" }, qr, logo, "c"]).nodes).toEqual([
      { type: "text", text: "ab", color: "ansi-red" },
      { type: "pre", text: "##\n##", rainbow: { row: 1, col: 0 } },
      qr,
      logo,
      { type: "text", text: "c", color: "ansi-green" },
    ]);
  });

  it("colors the cells of a table by their rows and columns", () => {
    const pre: LogNode = { type: "pre", text: "#\n#\n#" };
    expect(lolcat([{ type: "table", rows: [[["ab"], [pre]], [["d"]]] }, "e"]).nodes).toEqual([
      {
        type: "table",
        rows: [
          [
            [{ type: "text", text: "ab", color: "ansi-red" }],
            [{ ...pre, rainbow: { row: 0, col: 3 } }],
          ],
          [[{ type: "text", text: "d", color: "ansi-yellow" }]],
        ],
      },
      { type: "text", text: "e", color: "ansi-green" },
    ]);
  });
});

describe("createPipe (TASK-99)", () => {
  it("colors what grep has kept, wherever lolcat stands", () => {
    const stages: PipeStage[] = [
      { type: "lolcat" },
      { type: "grep", pattern: "bo", ignoreCase: false },
    ];
    expect(createPipe(stages)(["help\nabout"])).toEqual([
      { type: "text", text: "a", color: "ansi-red" },
      { type: "text", text: "b", color: "ansi-red" },
      { type: "text", text: "o", color: "ansi-yellow" },
      { type: "text", text: "u", color: "ansi-yellow" },
      { type: "text", text: "t", color: "ansi-green" },
    ]);
  });

  it("goes on with the rainbow from one log on the next line", () => {
    const pipe = createPipe([{ type: "lolcat" }]);
    expect(pipe(["ab"])).toEqual([{ type: "text", text: "ab", color: "ansi-red" }]);
    expect(pipe(["ab"])).toEqual([
      { type: "text", text: "a", color: "ansi-red" },
      { type: "text", text: "b", color: "ansi-yellow" },
    ]);
  });

  it("only filters without lolcat", () => {
    expect(
      createPipe([{ type: "grep", pattern: "he", ignoreCase: false }])(["help\nabout"]),
    ).toEqual([{ type: "text", text: "he", color: "accent" }, "lp"]);
  });
});
