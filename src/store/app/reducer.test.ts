import { describe, expect, it } from "vitest";
import { setLanguage, setStatus, setTheme } from "./actions";
import { AppState } from "./interfaces";
import { reducer } from "./reducer";

const initialState: AppState = { status: "init", language: "ru", theme: "Black" };

describe("app reducer", () => {
  it("sets status, language and theme", () => {
    let state = reducer(initialState, setStatus("ok"));
    state = reducer(state, setLanguage("eng"));
    state = reducer(state, setTheme("Hacker"));
    expect(state).toEqual({ status: "ok", language: "eng", theme: "Hacker" });
  });
});
