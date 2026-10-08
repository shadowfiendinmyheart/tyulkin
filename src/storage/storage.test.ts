import { afterEach, describe, expect, it, vi } from "vitest";
import { CaretMode } from "../domain";
import storage from ".";

afterEach(() => {
  localStorage.clear();
});

describe("storage", () => {
  it("round-trips valid values", () => {
    storage.setCaretMode(CaretMode.Line);
    storage.setThemeMode("Hacker");
    storage.setLanguage("eng");
    expect(storage.getCaretMode()).toBe(CaretMode.Line);
    expect(storage.getThemeMode()).toBe("Hacker");
    expect(storage.getLanguage()).toBe("eng");
  });

  it("falls back to defaults on missing values", () => {
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("ru");
  });

  it("falls back to defaults on garbage values", () => {
    localStorage.setItem("caretMode", "Line");
    localStorage.setItem("themeMode", "neon");
    localStorage.setItem("language", "de");
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("ru");
  });

  it("rejects empty values and values valid only for another setting", () => {
    localStorage.setItem("caretMode", "");
    localStorage.setItem("themeMode", "ru");
    localStorage.setItem("language", "Hacker");
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("ru");
  });

  it("survives blocked storage", () => {
    const error = new DOMException("blocked", "SecurityError");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw error;
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw error;
    });
    expect(() => storage.setLanguage("eng")).not.toThrow();
    expect(() => storage.setCaretMode(CaretMode.Line)).not.toThrow();
    expect(() => storage.setThemeMode("White")).not.toThrow();
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("ru");
  });
});
