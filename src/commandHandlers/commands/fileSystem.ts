import { ConsoleRouteValues } from "../../router/interfaces";
import { LogNode } from "../../store/console/interfaces";
import { joinNodes, withNode } from "../../store/console/logNodes";
import {
  drawTree,
  formatPath,
  FsNode,
  FsPath,
  getCompletions,
  getSortedChildren,
  resolvePath,
} from "../fileSystem";
import { Command, CommandContext } from "../interfaces";

// an entry of `ls`: the name, a click opens it from anywhere (the logs outlive the page)
const getEntry = (path: FsPath): LogNode => {
  const node = path[path.length - 1];
  return node.kind === "directory"
    ? { type: "command", command: `cd ${formatPath(path)}`, label: `${node.name}/` }
    : { type: "command", command: `cat ${formatPath(path)}`, label: node.name };
};

// the node of the expected kind, any node without one
type NodeOf<Kind> = Kind extends FsNode["kind"] ? Extract<FsNode, { kind: Kind }> : FsNode;

// the path typed to a command, of the kind it expects (any kind without one); otherwise the
// error is logged as a shell puts it: "cd: foo: No such file or directory"
const resolveTyped = <Kind extends FsNode["kind"] | undefined>(
  { log, t, fail }: CommandContext,
  route: ConsoleRouteValues,
  command: string,
  typed: string,
  kind: Kind,
): { path: FsPath; node: NodeOf<Kind> } | undefined => {
  const path = resolvePath(route, typed);
  const getKey = () => {
    if (!path) return "fsNotFound";
    const node = path[path.length - 1];
    // "about.md/": a file is not a directory
    if (node.kind === "file" && (kind === "directory" || typed.endsWith("/")))
      return "fsNotDirectory";
    if (node.kind === "directory" && kind === "file") return "fsIsDirectory";
    return { path, node: node as NodeOf<Kind> };
  };
  const result = getKey();
  if (typeof result !== "string") return result;
  // the path is the visitor's: plain text
  log({ type: "text", text: t({ key: result, args: { command, path: typed } }), color: "error" });
  fail();
};

// `ls`, `cd`, `cat` and `tree` of a page: paths are relative to its directory, and Tab completes
// them (params); `pwd` is global
export const getFileSystemCommands = (route: ConsoleRouteValues): Command[] => {
  const directories = getCompletions(route, "directory");
  return [
    {
      name: "ls",
      // a file is listed too: `ls about.md`
      params: [...directories, ...getCompletions(route, "file")],
      bareCompletion: true,
      descriptionKey: "helpLs",
      run: (ctx, [typed = "."]) => {
        const resolved = resolveTyped(ctx, route, "ls", typed, undefined);
        if (!resolved) return;
        const { path, node } = resolved;
        // an empty directory prints nothing, as in a shell
        const entries =
          node.kind === "directory"
            ? getSortedChildren(node).map((child) => getEntry([...path, child]))
            : [getEntry(path)];
        if (entries.length) ctx.log(joinNodes(entries, "   "));
      },
    },
    {
      // the directory is the page: cd navigates, `cd` alone goes home
      name: "cd",
      params: directories,
      bareCompletion: true,
      descriptionKey: "helpCd",
      shareable: false,
      run: (ctx, [typed = "~"]) => {
        const target = resolveTyped(ctx, route, "cd", typed, "directory")?.node.route;
        // to the same page: nothing to do, and no extra entry in the browser history
        if (target && target !== route) ctx.navigate(target);
      },
    },
    {
      name: "cat",
      params: getCompletions(route, "file"),
      descriptionKey: "helpCat",
      run: (ctx, [typed]) => {
        const { log, t } = ctx;
        if (!typed) {
          log(
            withNode((ls) => t({ key: "catUsage", args: { ls } }), {
              type: "command",
              command: "ls",
            }),
          );
          return;
        }
        const file = resolveTyped(ctx, route, "cat", typed, "file")?.node;
        file?.read(t).forEach((content) => log(content));
      },
    },
    {
      name: "tree",
      params: directories,
      bareCompletion: true,
      descriptionKey: "helpTree",
      run: (ctx, [typed = "."]) => {
        const directory = resolveTyped(ctx, route, "tree", typed, "directory")?.node;
        if (directory) ctx.log({ type: "pre", text: drawTree(directory, typed) });
      },
    },
  ];
};
