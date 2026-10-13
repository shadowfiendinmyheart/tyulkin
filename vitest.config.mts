import { defineConfig } from "vitest/config";

export default defineConfig({
  // the site root; the subpath build is covered by the e2e tests
  define: {
    __BASE_PATH__: JSON.stringify("/"),
    // a fixed history instead of the real one (scripts/git-log.cjs), so tests don't depend on it
    __GIT_LOG__: JSON.stringify([
      { date: "2026-10-13", subject: "[add] changelog command TASK-69" },
      { date: "2026-10-12", subject: "[fix] stable app tests TASK-79" },
      { date: "2023-12-18", subject: "init" },
    ]),
    // no repositories, as in a build without GITHUB_REPOS: tests never reach the GitHub API
    __GITHUB_REPOS__: JSON.stringify([]),
    // no posts, as in a build without content/: the blog is tested with its own posts
    __BLOG_POSTS__: JSON.stringify([]),
    // no service worker, as on the dev server
    __SERVICE_WORKER__: JSON.stringify(""),
  },
  test: {
    environment: "jsdom",
    // scripts/*.test.mjs: the build-time scripts (in the node environment, see the file comment)
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    setupFiles: ["src/setupTests.ts"],
    // above asyncUtilTimeout (src/setupTests.ts): a test may wait several times, and
    // App.routing.test re-imports the whole app per test, which takes seconds under load
    testTimeout: 20_000,
    restoreMocks: true,
  },
});
