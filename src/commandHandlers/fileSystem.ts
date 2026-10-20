import { TFunction } from "../localization/interfaces";
import { CONSOLE_ROUTES } from "../router/const";
import { ConsoleRouteValues } from "../router/interfaces";
import { LogContent } from "../store/console/interfaces";
import { sections } from "./sections";
import { HOME_DIRECTORY } from "./shell";

// the virtual file system (TASK-60): the sections of the CV are files of the home directory,
// and every directory is a page of the terminal, so the working directory is in the URL

export interface FileNode {
  kind: "file";
  name: string;
  // the logs `cat` prints: the same texts as the commands of the sections
  read: (t: TFunction) => LogContent[];
}

export interface DirectoryNode {
  kind: "directory";
  name: string;
  route: ConsoleRouteValues;
  children: FsNode[];
}

export type FsNode = FileNode | DirectoryNode;

// the nodes from the home down to a node: its path
export type FsPath = FsNode[];

const file = (name: string, read: FileNode["read"]): FileNode => ({ kind: "file", name, read });

export const HOME: DirectoryNode = {
  kind: "directory",
  name: "~",
  route: CONSOLE_ROUTES.MAIN,
  children: [
    file("about.md", sections.about),
    file("contacts.md", sections.contacts),
    file("education.md", sections.education),
    file("experience.md", sections.experience),
    {
      kind: "directory",
      name: "projects",
      route: CONSOLE_ROUTES.PROJECTS,
      children: [file("README.md", sections.projects)],
    },
    { kind: "directory", name: "settings", route: CONSOLE_ROUTES.SETTINGS, children: [] },
    file("skills.md", sections.skills),
  ],
};

// every node of the tree with its path, depth first, the home first
const walk = (path: FsPath): FsPath[] => {
  const node = path[path.length - 1];
  if (node.kind === "file") return [path];
  return [path, ...node.children.flatMap((child) => walk([...path, child]))];
};
export const ALL_PATHS = walk([HOME]);

const isDirectoryPath = (path: FsPath): path is DirectoryNode[] =>
  path[path.length - 1].kind === "directory";

// the path of the directory of a page; the home for a route without one
export const getDirectoryPath = (route: ConsoleRouteValues): DirectoryNode[] =>
  ALL_PATHS.filter(isDirectoryPath).find((path) => path[path.length - 1].route === route) ?? [HOME];

// "~/projects/README.md"
export const formatPath = (path: FsPath) =>
  ["~", ...path.slice(1).map(({ name }) => name)].join("/");

// a path as typed, from the directory of the page: relative ("projects/", "../about.md"),
// from the home ("~/skills.md") or absolute ("/home/visitor/skills.md"); names are
// case-insensitive like the commands, ".." of the home is the home (as `back` on the main page).
// undefined: there is no such file or directory
export const resolvePath = (route: ConsoleRouteValues, typed: string): FsPath | undefined => {
  let path: FsPath = getDirectoryPath(route);
  let rest = typed;
  const lowerTyped = typed.toLowerCase();
  if (lowerTyped === "~" || lowerTyped.startsWith("~/")) {
    path = [HOME];
    rest = typed.slice(1);
  } else if (lowerTyped === HOME_DIRECTORY || lowerTyped.startsWith(`${HOME_DIRECTORY}/`)) {
    path = [HOME];
    rest = typed.slice(HOME_DIRECTORY.length);
  } else if (typed.startsWith("/")) {
    // outside the home there is nothing to show
    return undefined;
  }

  for (const segment of rest.split("/")) {
    if (!segment || segment === ".") continue;
    const node = path[path.length - 1];
    // "about.md/x": a file has nothing inside
    if (node.kind === "file") return undefined;
    if (segment === "..") {
      if (path.length > 1) path = path.slice(0, -1);
      continue;
    }
    const lowerSegment = segment.toLowerCase();
    const child = node.children.find(({ name }) => name.toLowerCase() === lowerSegment);
    if (!child) return undefined;
    path = [...path, child];
  }
  // "about.md/" is still the file: the commands tell that it is not a directory
  return path;
};

// a path as typed is an existing file or directory (TASK-86); "about.md/" is not, a file is not
// a directory
export const isExistingPath = (route: ConsoleRouteValues, typed: string) => {
  const path = resolvePath(route, typed);
  if (!path) return false;
  return !(typed.endsWith("/") && path[path.length - 1].kind === "file");
};

// the path of a node as typed from a directory: "projects/README.md", "..", "../about.md"
const getRelativePath = (from: FsPath, to: FsPath) => {
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common++;
  return [
    ...Array<string>(from.length - common).fill(".."),
    ...to.slice(common).map(({ name }) => name),
  ].join("/");
};

// what Tab completes after `cd` (directories) or `cat` (files) on a page: every node of the
// tree but the directory itself, relative to it
export const getCompletions = (route: ConsoleRouteValues, kind: FsNode["kind"]) => {
  const from = getDirectoryPath(route);
  return ALL_PATHS.filter((path) => path[path.length - 1].kind === kind)
    .map((path) => getRelativePath(from, path))
    .filter(Boolean);
};

// the entries of a directory in the order of `ls`: by name, case-insensitively
export const getSortedChildren = (directory: DirectoryNode) =>
  [...directory.children].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );

// `tree`: the directory and everything inside it, drawn with box characters
export const drawTree = (directory: DirectoryNode, title: string) => {
  const lines = [title];
  const drawChildren = (node: DirectoryNode, indent: string) => {
    const children = getSortedChildren(node);
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      lines.push(`${indent}${isLast ? "└── " : "├── "}${child.name}`);
      if (child.kind === "directory") drawChildren(child, `${indent}${isLast ? "    " : "│   "}`);
    });
  };
  drawChildren(directory, "");
  return lines.join("\n");
};
