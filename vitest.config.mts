import { defineConfig } from "vitest/config";

export default defineConfig({
  // the site root; the subpath build is covered by the e2e tests
  define: { __BASE_PATH__: JSON.stringify("/") },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
