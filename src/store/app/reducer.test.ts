import { describe, expect, it } from "vitest";
import { setPreviewTheme, setStatus, setTheme } from "./actions";
import { AppState } from "./interfaces";
import { reducer } from "./reducer";

const initialState: AppState = { status: "init", theme: "Black", previewTheme: null };

describe("app reducer", () => {
  it("sets status and theme", () => {
    let state = reducer(initialState, setStatus("ok"));
    state = reducer(state, setTheme("Hacker"));
    expect(state).toEqual({ status: "ok", theme: "Hacker", previewTheme: null });
  });

  it("sets and drops the preview theme, the theme stays (TASK-84)", () => {
    let state = reducer(initialState, setPreviewTheme("Nord"));
    expect(state).toEqual({ ...initialState, previewTheme: "Nord" });
    state = reducer(state, setPreviewTheme(null));
    expect(state).toEqual(initialState);
  });
});
