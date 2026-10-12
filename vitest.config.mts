import { defineConfig } from "vitest/config";

export default defineConfig({
  // the site root; the subpath build is covered by the e2e tests
  define: { __BASE_PATH__: JSON.stringify("/") },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/setupTests.ts"],
    // above asyncUtilTimeout (src/setupTests.ts): a test may wait several times, and
    // App.routing.test re-imports the whole app per test, which takes seconds under load
    testTimeout: 20_000,
    restoreMocks: true,
  },
});
