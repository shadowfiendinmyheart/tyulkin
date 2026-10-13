// class names of CSS modules are typed only by the generated *.module.scss.d.ts files
// (typed-scss-modules, see typed-scss-modules.config.ts; CI fails if they are stale or missing).
// Global (non-module) styles are imported for side effects only; under noUncheckedSideEffectImports (TS 6)
// such an import needs a declaration. It is deliberately narrow: a *.module.scss without its generated
// .d.ts stays "Cannot find module" instead of being silently typed
declare module "*/main.scss" {}

// fontsource CSS entry (side-effect import in main.tsx)
declare module "@fontsource/ibm-plex-mono/400";

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
