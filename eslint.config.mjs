import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
  globalIgnores(["dist", "dist-e2e", "playwright-report", "test-results", "webpack.config.js"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  // replaces eslint-plugin-react, which does not support ESLint 10; no React-in-scope rule (new JSX transform)
  eslintReact.configs["recommended-typescript"],
  // naming rules are new with the plugin switch and were not part of the previous setup
  eslintReact.configs["disable-naming-convention"],
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // equivalents of react/jsx-no-target-blank and react/no-unknown-property from the previous setup
      "@eslint-react/dom-no-unsafe-target-blank": "error",
      "@eslint-react/dom-no-unknown-property": "error",
    },
  },
  // node scripts: the e2e static server and tool configs
  {
    files: ["e2e/*.mjs", "*.config.{ts,mts}"],
    languageOptions: { globals: globals.node },
  },
  // must be last: disables stylistic rules and reports prettier diffs as eslint errors
  prettierRecommended,
]);
