// class names of CSS modules are typed only by the generated *.module.scss.d.ts files
// (typed-scss-modules, see typed-scss-modules.config.ts; CI fails if they are stale or missing).
// Global (non-module) styles are imported for side effects only; under noUncheckedSideEffectImports (TS 6)
// such an import needs a declaration. It is deliberately narrow: a *.module.scss without its generated
// .d.ts stays "Cannot find module" instead of being silently typed
declare module "*/main.scss" {}

// fontsource CSS entry (side-effect import in main.tsx)
declare module "@fontsource/ibm-plex-mono/400";
// the fonts of `set font`, loaded on demand (utils/font.ts, TASK-83)
declare module "@fontsource/jetbrains-mono/400";
declare module "@fontsource/fira-code/400";

// public path of the site, "/" or "/<subpath>/" (DefinePlugin in webpack.config.js, `define` in vitest)
declare const __BASE_PATH__: string;

// commits of the repo at build time, newest first (scripts/git-log.cjs; a fixed list in vitest)
declare const __GIT_LOG__: { date: string; subject: string }[];

// the owner's GitHub repositories at build time, for `projects` (scripts/github-repos.cjs; empty
// without GITHUB_REPOS, and in vitest)
declare const __GITHUB_REPOS__: {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
}[];

// the proxy of `ask` (TASK-71, ask-proxy/) from ASK_PROXY_URL at build time; empty without it (and in
// vitest): the command is not there
declare const __ASK_URL__: string;

// the service worker file of the production build ("sw.js", scripts/pwa.cjs); empty on the dev server and in vitest
declare const __SERVICE_WORKER__: string;

// the owner's blog posts, content/*.md compiled at build time, newest first (scripts/blog.cjs,
// TASK-70); empty without them, and in vitest
declare const __BLOG_POSTS__: {
  slug: string;
  title: string;
  // YYYY-MM-DD
  date: string;
  description: string;
  lang: "en" | "ru";
  blocks: BlogBlock[];
}[];

// a line of a post: bold, italic and code are not nested; links are absolute http(s) or mailto
type BlogInline = (
  | { type: "text" | "strong" | "em" | "code"; text: string }
  | { type: "link"; text: string; href: string }
)[];

// a block of a post: a small Markdown subset
type BlogBlock =
  | { type: "heading"; level: number; inline: BlogInline }
  | { type: "paragraph"; inline: BlogInline }
  | { type: "list"; ordered: boolean; start: number; items: BlogInline[] }
  | { type: "code"; text: string }
  | { type: "quote"; inline: BlogInline }
  | { type: "rule" };
