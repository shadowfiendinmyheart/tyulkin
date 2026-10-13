import { afterEach, describe, expect, it, vi } from "vitest";
import { CaretMode, HISTORY_LIMIT } from "../domain";
import storage from ".";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("storage", () => {
  it("round-trips valid values", () => {
    storage.setCaretMode(CaretMode.Line);
    storage.setThemeMode("Hacker");
    storage.setLanguage("ru");
    storage.setCrtMode("on");
    storage.setSoundMode("on");
    expect(storage.getCaretMode()).toBe(CaretMode.Line);
    expect(storage.getCrtMode()).toBe("on");
    expect(storage.getSoundMode()).toBe("on");
    expect(storage.getThemeMode()).toBe("Hacker");
    expect(storage.getLanguage()).toBe("ru");
  });

  it("keeps the secret theme unlocked by the Konami code (TASK-65)", () => {
    storage.setThemeMode("Amber");
    expect(storage.getThemeMode()).toBe("Amber");
  });

  it("falls back to defaults on missing values", () => {
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getCrtMode()).toBe("off");
    expect(storage.getSoundMode()).toBe("off");
    expect(storage.getThemeMode()).toBe("Black");
    expect(storage.getLanguage()).toBe("eng");
  });

  it("falls back to defaults on garbage values", () => {
    localStorage.setItem("caretMode", "Line");
    localStorage.setItem("themeMode", "neon");
    localStorage.setItem("language", "de");
    localStorage.setItem("crtMode", "true");
    localStorage.setItem("soundMode", "loud");
    expect(storage.getCaretMode()).toBe(CaretMode.Block);
    expect(storage.getCrtMode()).toBe("off");
    expect(storage.getSoundMode()).toBe("off");
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

describe("session and last login (TASK-53)", () => {
  it("remembers the session start in the session storage", () => {
    expect(storage.isSessionStarted()).toBe(false);
    storage.setSessionStarted();
    expect(storage.isSessionStarted()).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it("round-trips the last login and rejects garbage", () => {
    expect(storage.getLastLogin()).toBeNull();
    const date = new Date(2026, 0, 2);
    storage.setLastLogin(date);
    expect(storage.getLastLogin()).toEqual(date);
    for (const value of ["", "abc", "-5", "Infinity", "1e20"]) {
      localStorage.setItem("lastLogin", value);
      expect(storage.getLastLogin()).toBeNull();
    }
  });
});

describe("found secrets (TASK-63)", () => {
  it("adds a secret once, keeping the order of secretIds", () => {
    expect(storage.getFoundSecrets()).toEqual([]);
    expect(storage.addFoundSecret("konami")).toEqual(["konami"]);
    expect(storage.addFoundSecret("sudo")).toEqual(["sudo", "konami"]);
    expect(storage.addFoundSecret("konami")).toBeUndefined();
    expect(storage.getFoundSecrets()).toEqual(["sudo", "konami"]);
  });

  it("drops garbage", () => {
    for (const value of ["", "{", "{}", '"sudo"', '["sudo","root",1,"sudo"]']) {
      localStorage.setItem("foundSecrets", value);
      expect(storage.getFoundSecrets()).toEqual(value.includes("[") ? ["sudo"] : []);
    }
  });

  // last: a secret found without storage stays in memory for the rest of the file
  it("remembers secrets in memory when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(storage.addFoundSecret("vim")).toEqual(["vim"]);
    expect(storage.addFoundSecret("vim")).toBeUndefined();
    expect(storage.getFoundSecrets()).toEqual(["vim"]);
    vi.restoreAllMocks();
  });
});

describe("history (TASK-61)", () => {
  it("round-trips the history", () => {
    expect(storage.getHistory()).toEqual([]);
    storage.setHistory(["help", "about"]);
    expect(storage.getHistory()).toEqual(["help", "about"]);
  });

  it("drops garbage and keeps at most HISTORY_LIMIT commands", () => {
    localStorage.setItem("history", JSON.stringify(["help", 1, null, " ", "about"]));
    expect(storage.getHistory()).toEqual(["help", "about"]);
    localStorage.setItem("history", "{");
    expect(storage.getHistory()).toEqual([]);
    localStorage.setItem("history", JSON.stringify({ 0: "help" }));
    expect(storage.getHistory()).toEqual([]);
    localStorage.setItem("history", JSON.stringify(Array(HISTORY_LIMIT + 5).fill("ls")));
    expect(storage.getHistory()).toHaveLength(HISTORY_LIMIT);
  });
});
