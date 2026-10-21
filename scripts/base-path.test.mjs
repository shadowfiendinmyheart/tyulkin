// @vitest-environment node
// the base path of the build and the e2e server (TASK-104)
import { describe, expect, it } from "vitest";
import { normalizeBasePath } from "./base-path.cjs";

describe("normalizeBasePath", () => {
  it("accepts the name with or without slashes", () => {
    for (const value of ["tyulkin", "/tyulkin", "/tyulkin/", "tyulkin/", "//tyulkin//"]) {
      expect(normalizeBasePath(value)).toBe("/tyulkin/");
    }
    expect(normalizeBasePath("a/b")).toBe("/a/b/");
  });

  it("gives the site root for nothing", () => {
    for (const value of [undefined, "", "/", true]) {
      expect(normalizeBasePath(value)).toBe("/");
    }
  });

  it("rejects a path rewritten by Git Bash (MSYS)", () => {
    for (const value of [
      "C:/Program Files/Git/tyulkin/",
      "C:/Program Files/Git/",
      "d:\\x",
      "\\\\host\\git\\tyulkin\\",
    ]) {
      expect(() => normalizeBasePath(value)).toThrow(/without the leading slash/);
    }
  });
});
