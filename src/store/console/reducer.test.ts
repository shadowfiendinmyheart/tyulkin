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
import { reducer } from "./reducer";

const initialState: ConsoleState = {
  logs: [],
  history: [],
  caretMode: CaretMode.Block,
  commandsHint: [],
};

describe("console reducer", () => {
  it("adds and clears logs", () => {
    let state = reducer(initialState, addConsoleLog("hello"));
    state = reducer(state, addUserLog("ls", "~"));
    expect(state.logs).toEqual([{ message: "hello" }, { message: "~> ls" }]);
    expect(reducer(state, clearLogs()).logs).toEqual([]);
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

  it("hides the hint when there is a single option", () => {
    expect(reducer(initialState, setCommandsHint(["a", "b"])).commandsHint).toEqual(["a", "b"]);
    expect(reducer(initialState, setCommandsHint(["a"])).commandsHint).toEqual([]);
  });
});
