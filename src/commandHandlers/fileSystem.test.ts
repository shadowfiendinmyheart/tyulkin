import { describe, expect, it } from "vitest";
import { CONSOLE_ROUTES } from "../router/const";
import {
  ALL_PATHS,
  drawTree,
  formatPath,
  FsPath,
  getCompletions,
  getDirectoryPath,
  HOME,
  resolvePath,
} from "./fileSystem";

const format = (path: FsPath | undefined) => path && formatPath(path);

describe("file system tree (TASK-60)", () => {
  it("has a directory for every page, at the path of its route", () => {
    const directories = ALL_PATHS.filter((path) => path[path.length - 1].kind === "directory");
    expect(directories).toHaveLength(Object.values(CONSOLE_ROUTES).length);
    for (const route of Object.values(CONSOLE_ROUTES)) {
      const path = getDirectoryPath(route);
      expect(path[path.length - 1]).toMatchObject({ kind: "directory", route });
      expect(formatPath(path)).toBe(`~${route.replace(/\/$/, "")}`);
    }
  });

  it("formats paths from the home", () => {
    expect(formatPath([HOME])).toBe("~");
    expect(format(resolvePath("/", "projects/README.md"))).toBe("~/projects/README.md");
  });
});

describe("resolvePath (TASK-60)", () => {
  it("resolves relative paths from the directory of the page", () => {
    expect(format(resolvePath("/", "about.md"))).toBe("~/about.md");
    expect(format(resolvePath("/", "./projects/"))).toBe("~/projects");
    expect(format(resolvePath("/settings", "../skills.md"))).toBe("~/skills.md");
    expect(format(resolvePath("/settings", ".."))).toBe("~");
    expect(format(resolvePath("/projects", "../settings"))).toBe("~/settings");
    expect(format(resolvePath("/projects", "."))).toBe("~/projects");
  });

  it("resolves paths from the home and absolute ones", () => {
    expect(format(resolvePath("/settings", "~"))).toBe("~");
    expect(format(resolvePath("/settings", "~/about.md"))).toBe("~/about.md");
    expect(format(resolvePath("/", "/home/visitor/projects/README.md"))).toBe(
      "~/projects/README.md",
    );
    expect(format(resolvePath("/projects", "/home/visitor"))).toBe("~");
  });

  it("ignores the case of names, as the commands do", () => {
    expect(format(resolvePath("/", "ABOUT.md"))).toBe("~/about.md");
    expect(format(resolvePath("/", "about.md/"))).toBe("~/about.md");
    expect(format(resolvePath("/", "Projects/readme.MD"))).toBe("~/projects/README.md");
  });

  it("stays in the home on .. above it", () => {
    expect(format(resolvePath("/", ".."))).toBe("~");
    expect(format(resolvePath("/settings", "../../.."))).toBe("~");
  });

  it("finds nothing that is not there", () => {
    expect(resolvePath("/", "missing.md")).toBeUndefined();
    expect(resolvePath("/", "/etc/passwd")).toBeUndefined();
    expect(resolvePath("/", "/")).toBeUndefined();
    expect(resolvePath("/", "/home/visitorx")).toBeUndefined();
    expect(resolvePath("/", "about.md/x")).toBeUndefined();
    expect(resolvePath("/", "about.md/..")).toBeUndefined();
  });
});

describe("getCompletions (TASK-60)", () => {
  it("completes directories and files relative to the page", () => {
    expect(getCompletions("/", "directory")).toEqual(["projects", "settings"]);
    expect(getCompletions("/settings", "directory")).toEqual(["..", "../projects"]);
    expect(getCompletions("/projects", "file")).toEqual([
      "../about.md",
      "../contacts.md",
      "../education.md",
      "../experience.md",
      "README.md",
      "../skills.md",
    ]);
  });
});

describe("drawTree (TASK-60)", () => {
  it("draws the directories and files sorted by name", () => {
    expect(drawTree(HOME, ".")).toBe(
      [
        ".",
        "├── about.md",
        "├── contacts.md",
        "├── education.md",
        "├── experience.md",
        "├── projects",
        "│   └── README.md",
        "├── settings",
        "└── skills.md",
      ].join("\n"),
    );
  });
});
