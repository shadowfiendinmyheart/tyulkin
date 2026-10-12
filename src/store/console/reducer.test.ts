import { describe, expect, it } from "vitest";
import { CaretMode } from "../../domain";
import {
  addConsoleLog,
  addHistoryCommand,
  addUserLog,
  clearLogs,
  setCaretMode,
  setCommandsHint,
} from "./actions";
import { ConsoleState } from "./interfaces";
import { MAX_LOGS, reducer } from "./reducer";

const initialState: ConsoleState = {
  logs: [],
  nextLogId: 0,
  history: [],
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

  it("sets caret mode", () => {
    expect(reducer(initialState, setCaretMode(CaretMode.Underline)).caretMode).toBe(
      CaretMode.Underline,
    );
  });

  it("sets the commands hint as is", () => {
    expect(reducer(initialState, setCommandsHint(["a", "b"])).commandsHint).toEqual(["a", "b"]);
    expect(reducer(initialState, setCommandsHint(["a"])).commandsHint).toEqual(["a"]);
  });
});
