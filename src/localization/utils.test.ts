import { describe, expect, it } from "vitest";
import { checkLanguage, getLocaleWithArgs } from "./utils";

describe("getLocaleWithArgs", () => {
  it("substitutes args", () => {
    expect(
      getLocaleWithArgs({
        key: "changeTheme",
        args: { themeName: "Black" },
        locale: "theme $themeName set",
      }),
    ).toBe("theme Black set");
  });

  it("substitutes multi-word args", () => {
    expect(
      getLocaleWithArgs({
        key: "404command",
        args: { unknownCommand: "foo bar", help: "help", ls: "ls" },
        locale: "Command $unknownCommand not found",
      }),
    ).toBe("Command foo bar not found");
  });
});

describe("checkLanguage", () => {
  it("accepts known languages only", () => {
    expect(checkLanguage("ru")).toBe("ru");
    expect(checkLanguage("eng")).toBe("eng");
    expect(checkLanguage("de")).toBeUndefined();
  });
});

describe("getLocaleWithArgs placeholders", () => {
  it("substitutes every occurrence", () => {
    expect(
      getLocaleWithArgs({
        key: "changeTheme",
        args: { themeName: "Black" },
        locale: "$themeName is $themeName",
      }),
    ).toBe("Black is Black");
  });

  it("keeps `$` patterns inside values and unknown placeholders as is", () => {
    expect(
      getLocaleWithArgs({
        key: "404command",
        args: { unknownCommand: "$& $unknownCommand $$", help: "help", ls: "ls" },
        locale: "Command $unknownCommand not found, $other",
      }),
    ).toBe("Command $& $unknownCommand $$ not found, $other");
  });

  it("substitutes a placeholder followed by word characters", () => {
    expect(
      getLocaleWithArgs({
        key: "themeList",
        args: { themes: "Black" },
        locale: "$themes_list: $themesX",
      }),
    ).toBe("Black_list: BlackX");
  });
});
