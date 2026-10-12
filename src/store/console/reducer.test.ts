import { describe, expect, it } from "vitest";
import { CaretMode } from "../../domain";
import {
  addConsoleLog,
  addHistoryCommand,
  addUserLog,
  clearLogs,
  countTypedCommand,
  finishTyping,
  setCaretMode,
  setCommandsHint,
  skipTyping,
} from "./actions";
import { ConsoleState } from "./interfaces";
import { MAX_LOGS, reducer } from "./reducer";

const initialState: ConsoleState = {
  logs: [],
  nextLogId: 0,
  typedLogId: 0,
  history: [],
  typedCommandsCount: 0,
  caretMode: CaretMode.Block,
  commandsHint: [],
};

describe("console reducer", () => {
  it("adds and clears logs", () => {
    let state = reducer(initialState, addConsoleLog("hello"));
    state = reducer(state, addUserLog("ls", "~"));
    expect(state.logs).toEqual([
      { content: ["hello"], id: 0 },
      { content: ["~> ls"], id: 1 },
    ]);
    expect(reducer(state, clearLogs()).logs).toEqual([]);
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

  it("counts typed commands (TASK-58)", () => {
    const state = reducer(reducer(initialState, countTypedCommand()), countTypedCommand());
    expect(state.typedCommandsCount).toBe(2);
  });

  it("sets caret mode", () => {
    expect(reducer(initialState, setCaretMode(CaretMode.Underline)).caretMode).toBe(
      CaretMode.Underline,
    );
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
      state = reducer(state, addUserLog("ls", "~"));
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
