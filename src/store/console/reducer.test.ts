import { describe, expect, it } from "vitest";
import { CaretMode, HISTORY_LIMIT } from "../../domain";
import {
  addConsoleLog,
  addHistoryCommand,
  addUserLog,
  clearHistory,
  clearLogs,
  countTypedCommand,
  failCommand,
  finishTyping,
  hideAchievement,
  setCaretMode,
  setCommandsHint,
  setCrtMode,
  setGame,
  setRoute,
  setSoundMode,
  showAchievement,
  skipTyping,
} from "./actions";
import { ConsoleState } from "./interfaces";
import { MAX_LOGS, reducer } from "./reducer";

const initialState: ConsoleState = {
  logs: [],
  nextLogId: 0,
  typedLogId: 0,
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
};

describe("console reducer", () => {
  it("hides the shown achievement only, not a newer one (TASK-97)", () => {
    const first = showAchievement("vim", 1);
    const second = showAchievement("sl", 2);
    let state = reducer(initialState, first);
    state = reducer(state, second);
    expect(reducer(state, hideAchievement(first.payload.id))).toBe(state);
    expect(reducer(state, hideAchievement(second.payload.id)).achievement).toBeNull();
  });

  it("adds and clears logs", () => {
    let state = reducer(initialState, addConsoleLog("hello"));
    state = reducer(state, addUserLog("ls", "~$"));
    expect(state.logs).toEqual([
      { content: ["hello"], id: 0 },
      { content: ["~$ ls"], id: 1, echo: expect.objectContaining({ prompt: "~$", input: "ls" }) },
    ]);
    expect(reducer(state, clearLogs()).logs).toEqual([]);
  });

  it("marks the block of its command failed, even after another command (TASK-82)", () => {
    const failing = addUserLog("ask hi", "~$", "ask hi");
    let state = reducer(initialState, failing);
    state = reducer(state, addConsoleLog("thinking…"));
    state = reducer(state, addUserLog("ls", "~$", "ls"));
    state = reducer(state, addUserLog("pw^C", "~$"));
    state = reducer(state, failCommand(failing.payload.echo.blockId));
    expect(state.logs.map((log) => log.echo?.failed)).toEqual([
      true,
      undefined,
      undefined,
      undefined,
    ]);
    // already failed, or dropped by clear: nothing changes
    expect(reducer(state, failCommand(failing.payload.echo.blockId))).toBe(state);
    expect(reducer(initialState, failCommand(failing.payload.echo.blockId))).toBe(initialState);
  });

  it("marks a log with the page it is printed on, a late one with the page of its block (TASK-103)", () => {
    let state = reducer(initialState, addConsoleLog("before any page"));
    state = reducer(state, setRoute("/"));
    const ask = addUserLog("ask hi", "~$", "ask hi");
    state = reducer(state, ask);
    state = reducer(state, addUserLog("cd settings", "~$", "cd settings"));
    state = reducer(state, setRoute("/settings"));
    state = reducer(state, addConsoleLog("settings welcome"));
    state = reducer(state, addConsoleLog("late answer", ask.payload.echo.blockId));
    expect(state.logs.map(({ content, route }) => [content[0], route])).toEqual([
      ["before any page", undefined],
      ["~$ ask hi", "/"],
      ["late answer", "/"],
      ["~$ cd settings", "/"],
      ["settings welcome", "/settings"],
    ]);
    expect(reducer(state, setRoute("/settings"))).toBe(state);
  });

  it("puts the output of a block after its last log, even after another command (TASK-102)", () => {
    const asking = addUserLog("ask hi", "~$", "ask hi");
    const { blockId } = asking.payload.echo;
    let state = reducer(initialState, addConsoleLog("welcome"));
    state = reducer(state, asking);
    state = reducer(state, addConsoleLog("thinking…", blockId));
    // the latest block: at the end, as without a block
    expect(state.logs.at(-1)?.content).toEqual(["thinking…"]);
    state = reducer(state, addUserLog("ls", "~$", "ls"));
    state = reducer(state, addConsoleLog("about.md"));
    state = reducer(state, addConsoleLog("React", blockId));
    state = reducer(state, addConsoleLog("TypeScript", blockId));
    expect(state.logs.map((log) => log.content[0])).toEqual([
      "welcome",
      "~$ ask hi",
      "thinking…",
      "React",
      "TypeScript",
      "~$ ls",
      "about.md",
    ]);
    // ids stay in the order of adding: the late lines are typed out after the shown ones
    expect(state.logs.map((log) => log.id)).toEqual([0, 1, 2, 5, 6, 3, 4]);
    // the block is gone (Ctrl+L): before the newer commands, at the end when there are none
    state = reducer(reducer(state, clearLogs()), addConsoleLog("late", blockId));
    expect(state.logs.map((log) => log.content[0])).toEqual(["late"]);
    state = reducer(state, addUserLog("ls", "~$", "ls"));
    state = reducer(state, addConsoleLog("later", blockId));
    expect(state.logs.map((log) => log.content[0])).toEqual(["late", "later", "~$ ls"]);
  });

  it("types out the next kept log when the typed one is dropped out of order (TASK-102)", () => {
    const asking = addUserLog("ask hi", "~$", "ask hi");
    let state = reducer(initialState, asking);
    state = reducer(state, addUserLog("ls", "~$", "ls"));
    for (let i = 0; i < MAX_LOGS - 3; i++) state = reducer(state, addConsoleLog(`log ${i}`));
    state = reducer(state, skipTyping());
    // a late line of the oldest block, being typed out, then the block is dropped
    state = reducer(state, addConsoleLog("late", asking.payload.echo.blockId));
    expect(state.logs[1].content).toEqual(["late"]);
    expect(state.typedLogId).toBe(state.logs[1].id);
    state = reducer(state, addConsoleLog("next"));
    state = reducer(state, addConsoleLog("after"));
    expect(state.logs.map((log) => log.content[0])).not.toContain("late");
    // not stuck on the dropped one: the next not typed out
    expect(state.typedLogId).toBe(state.logs.at(-2)?.id);
  });

  it("goes on past a late log dropped before its turn (TASK-102)", () => {
    const asking = addUserLog("ask hi", "~$", "ask hi");
    let state = reducer(initialState, asking);
    state = reducer(state, addUserLog("ls", "~$", "ls"));
    state = reducer(state, addConsoleLog("typed"));
    for (let i = 0; i < MAX_LOGS - 4; i++) state = reducer(state, addConsoleLog(`log ${i}`));
    // typing is on "typed" when a late line of the oldest block comes, then it is dropped
    const late = state.nextLogId;
    state = reducer(state, addConsoleLog("late", asking.payload.echo.blockId));
    state = reducer(state, addConsoleLog("next"));
    state = reducer(state, addConsoleLog("after"));
    expect(state.logs.map((log) => log.id)).not.toContain(late);
    expect(state.typedLogId).toBe(2);
    state = reducer(state, finishTyping(late - 1));
    expect(state.typedLogId).toBe(late + 1);
  });

  it("starts and ends a game (TASK-66) with the fail of its command (TASK-101)", () => {
    const game = { id: "snake", blockId: 1, fail: () => undefined } as const;
    const state = reducer(initialState, setGame(game));
    expect(state.game).toBe(game);
    // the same game again goes on with the block that started it
    expect(reducer(state, setGame({ ...game, blockId: 2 }))).toBe(state);
    expect(reducer(state, setGame(null)).game).toBeNull();
    expect(reducer(initialState, setGame(null))).toBe(initialState);
  });

  it("keeps log ids unique after clear", () => {
    let state = reducer(initialState, addConsoleLog("a"));
    state = reducer(state, clearLogs());
    state = reducer(state, addConsoleLog("b"));
    expect(state.logs).toEqual([{ content: ["b"], id: 1 }]);
  });

  it("keeps only the newest MAX_LOGS logs (TASK-52)", () => {
    let state = initialState;
    for (let i = 0; i < MAX_LOGS + 2; i++) state = reducer(state, addConsoleLog(`log ${i}`));
    expect(state.logs).toHaveLength(MAX_LOGS);
    expect(state.logs[0]).toEqual({ content: ["log 2"], id: 2 });
    expect(state.logs.at(-1)).toEqual({ content: [`log ${MAX_LOGS + 1}`], id: MAX_LOGS + 1 });
  });

  it("keeps history newest first", () => {
    let state = reducer(initialState, addHistoryCommand("ls"));
    state = reducer(state, addHistoryCommand("help"));
    expect(state.history).toEqual(["help", "ls"]);
  });

  it("skips empty commands and repeats of the last one", () => {
    const state = reducer(initialState, addHistoryCommand("ls"));
    expect(reducer(state, addHistoryCommand("ls"))).toBe(state);
    expect(reducer(state, addHistoryCommand(""))).toBe(state);
  });

  it("keeps the newest HISTORY_LIMIT commands and clears them (TASK-61)", () => {
    let state = initialState;
    for (let i = 0; i <= HISTORY_LIMIT; i++) state = reducer(state, addHistoryCommand(`echo ${i}`));
    expect(state.history).toHaveLength(HISTORY_LIMIT);
    expect(state.history[0]).toBe(`echo ${HISTORY_LIMIT}`);
    // the length no longer grows, the counter does
    expect(state.historyAdded).toBe(HISTORY_LIMIT + 1);
    expect(reducer(state, clearHistory()).history).toEqual([]);
    expect(reducer(initialState, clearHistory())).toBe(initialState);
  });

  it("counts typed commands (TASK-58)", () => {
    const state = reducer(reducer(initialState, countTypedCommand()), countTypedCommand());
    expect(state.typedCommandsCount).toBe(2);
  });

  it("sets caret mode", () => {
    expect(reducer(initialState, setCaretMode(CaretMode.Underline)).caretMode).toBe(
      CaretMode.Underline,
    );
  });

  it("sets the crt mode (TASK-64)", () => {
    expect(reducer(initialState, setCrtMode("on")).crtMode).toBe("on");
  });

  it("sets the sound mode (TASK-67)", () => {
    expect(reducer(initialState, setSoundMode("on")).soundMode).toBe("on");
  });

  it("sets the commands hint as is", () => {
    expect(reducer(initialState, setCommandsHint(["a", "b"])).commandsHint).toEqual(["a", "b"]);
    expect(reducer(initialState, setCommandsHint(["a"])).commandsHint).toEqual(["a"]);
  });

  describe("typing out (TASK-53)", () => {
    it("types logs one after another", () => {
      let state = reducer(initialState, addConsoleLog("a"));
      state = reducer(state, addConsoleLog("b"));
      expect(state.typedLogId).toBe(0);
      state = reducer(state, finishTyping(0));
      expect(state.typedLogId).toBe(1);
      // a late timer of an already typed log
      expect(reducer(state, finishTyping(0))).toBe(state);
    });

    it("goes on from the oldest kept log when the typed one is dropped", () => {
      let state = initialState;
      for (let i = 0; i < MAX_LOGS + 2; i++) state = reducer(state, addConsoleLog(`log ${i}`));
      expect(state.typedLogId).toBe(state.logs[0].id);
    });

    it("shows the echoed input and everything before it at once", () => {
      let state = reducer(initialState, addConsoleLog("a"));
      state = reducer(state, addUserLog("ls", "~$"));
      expect(state.typedLogId).toBe(2);
    });

    it("skips typing and has nothing to type after clear", () => {
      let state = reducer(initialState, addConsoleLog("a"));
      state = reducer(state, addConsoleLog("b"));
      expect(reducer(state, skipTyping()).typedLogId).toBe(2);
      expect(reducer(state, clearLogs()).typedLogId).toBe(2);
      const skipped = reducer(state, skipTyping());
      expect(reducer(skipped, skipTyping())).toBe(skipped);
    });
  });
});
