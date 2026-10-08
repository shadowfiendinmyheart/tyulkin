// the package exports no config type from its entry point, hence the deep import
import type { ConfigOptions } from "typed-scss-modules/dist/lib/core/types";

// picked up by every typed-scss-modules run (npm run typed-styles, CI --listDifferent):
// css-loader is set to namedExport: false, so the typings must declare a default export only
export const config = {
  exportType: "default",
} satisfies Partial<ConfigOptions>;
