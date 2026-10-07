import { describe, expect, it } from "vitest";
import { setStatus, setTheme } from "./actions";
import { AppState } from "./interfaces";
import { reducer } from "./reducer";

const initialState: AppState = { status: "init", theme: "Black" };

describe("app reducer", () => {
  it("sets status and theme", () => {
    let state = reducer(initialState, setStatus("ok"));
    state = reducer(state, setTheme("Hacker"));
    expect(state).toEqual({ status: "ok", theme: "Hacker" });
  });
});
