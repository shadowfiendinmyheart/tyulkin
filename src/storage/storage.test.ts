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
    storage.setLanguage("ru");
    expect(storage.getCaretMode()).toBe(CaretMode.Line);
    expect(storage.getThemeMode()).toBe("Hacker");
    expect(storage.getLanguage()).toBe("ru");
  });

  it("falls back to defaults on missing values", () => {
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("eng");
  });

  it("falls back to defaults on garbage values", () => {
    localStorage.setItem("caretMode", "Line");
    localStorage.setItem("themeMode", "neon");
    localStorage.setItem("language", "de");
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("eng");
  });

  it("rejects empty values and values valid only for another setting", () => {
    localStorage.setItem("caretMode", "");
    localStorage.setItem("themeMode", "ru");
    localStorage.setItem("language", "Hacker");
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("eng");
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
    expect(storage.getLanguage()).toBe("eng");
  });
});

describe("language by browser (TASK-72)", () => {
  const mockBrowserLanguages = (preferred: string[]) => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(preferred);
  };

  it("takes the first supported browser language until one is set", () => {
    mockBrowserLanguages(["de-DE", "ru-RU", "en-US"]);
    expect(storage.getLanguage()).toBe("ru");
    mockBrowserLanguages(["EN-gb", "ru"]);
    expect(storage.getLanguage()).toBe("eng");
  });

  it("falls back to English when no browser language is supported", () => {
    mockBrowserLanguages(["de-DE", "fr"]);
    expect(storage.getLanguage()).toBe("eng");
  });

  it("prefers the stored language", () => {
    mockBrowserLanguages(["ru-RU"]);
    storage.setLanguage("eng");
    expect(storage.getLanguage()).toBe("eng");
  });
});
