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
        args: { unknownCommand: "foo bar" },
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
