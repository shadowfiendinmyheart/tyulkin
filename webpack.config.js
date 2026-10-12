const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { DefinePlugin } = require("webpack");
const eng = require("./src/localization/dictionaries/eng.json");

// static CV text for crawlers and no-JS visitors, taken from the dictionary (single source)
const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const toHtmlLines = (text) => escapeHtml(text).split("\n").join("<br />");

// the prompt and commands are Latin in every language, so the Latin subset is preloaded;
// the Cyrillic one is fetched on demand (unicode-range) only when Russian text is shown
const PRELOADED_FONT = "ibm-plex-mono-latin-400-normal.woff2";

// adds <link rel="preload"> for the emitted (hashed) font file; fails the build if the file is gone
class FontPreloadPlugin {
  apply(compiler) {
    // thisCompilation: the HTML hooks run only in the main compilation, not in child compilers
    compiler.hooks.thisCompilation.tap("FontPreloadPlugin", (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tap(
        "FontPreloadPlugin",
        (data) => {
          // matched by source file, so the output filename pattern can change freely
          const font = compilation
            .getAssets()
            .find(({ info }) => path.basename(info.sourceFilename || "") === PRELOADED_FONT);
          if (!font) {
            compilation.errors.push(
              new Error(`FontPreloadPlugin: no asset emitted from ${PRELOADED_FONT}`),
            );
            return data;
          }
          data.headTags.unshift(
            HtmlWebpackPlugin.createHtmlTagObject("link", {
              rel: "preload",
              href: data.publicPath + font.name,
              as: "font",
              type: "font/woff2",
              // fonts are always fetched in CORS mode; without it the preload is not reused
              crossorigin: true,
            }),
          );
          return data;
        },
      );
    });
  }
}

// "tyulkin", "/tyulkin" or "/tyulkin/" -> "/tyulkin/"; nothing -> "/"
const normalizeBasePath = (basePath) => {
  // `--env basePath` without a value gives `true`
  const trimmed = (typeof basePath === "string" ? basePath : "").replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
};

module.exports = (env, argv) => {
  const mode = argv.mode || "development";
  const isProduction = mode === "production";
  const devtool = isProduction ? false : "inline-source-map";
  // the site may live in a subpath (GitHub Pages project site): `webpack --env basePath=/tyulkin/`;
  // asset URLs and the router basename both come from it
  const basePath = normalizeBasePath(env.basePath);

  const htmlOptions = {
    template: "./src/index.html",
    templateParameters: {
      about: toHtmlLines(eng.about),
      experience: toHtmlLines(eng.experience),
      skills: toHtmlLines(eng.skills),
      projects: toHtmlLines(eng.projects),
      education: toHtmlLines(eng.education),
      contacts: toHtmlLines(eng.contacts),
    },
  };

  return {
    mode,
    entry: "./src/main.tsx",
    devtool,
    output: {
      path: path.join(__dirname, "/dist"),
      // content hash in production for cache busting; stable names keep dev simple
      filename: isProduction ? "[name].[contenthash].js" : "[name].js",
      // absolute asset URLs so nested routes served via historyApiFallback (/settings/foo) still load
      publicPath: basePath,
      clean: true,
    },
    devServer: {
      historyApiFallback: { index: basePath },
    },
    module: {
      rules: [
        {
          test: /\.(css|scss)$/,
          // extracted CSS in production avoids FOUC; style-loader in dev for HMR
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            {
              loader: "css-loader",
              options: {
                // css-loader 7 defaults to named exports; the code imports `styles` as the default export.
                // auto: modules only for *.module.* (an options object alone enables them for all files);
                // as-is: keep v6 class names (the default turns to camel-case-only without named exports)
                modules: { auto: true, namedExport: false, exportLocalsConvention: "as-is" },
              },
            },
            "sass-loader",
          ],
        },
        {
          test: /\.woff2?$/,
          type: "asset/resource",
          generator: {
            filename: isProduction ? "fonts/[name].[contenthash][ext]" : "fonts/[name][ext]",
          },
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loader: "ts-loader",
          options: {
            // emit TS source maps only when webpack's devtool consumes them (not in tsconfig: tsc is check-only)
            compilerOptions: { sourceMap: Boolean(devtool) },
          },
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    plugins: [
      new HtmlWebpackPlugin(htmlOptions),
      // SPA fallback for static hosting without rewrites (GitHub Pages serves 404.html for any
      // unknown path): a direct visit to /settings gets the same app, and the router picks the page
      ...(isProduction ? [new HtmlWebpackPlugin({ ...htmlOptions, filename: "404.html" })] : []),
      new DefinePlugin({ __BASE_PATH__: JSON.stringify(basePath) }),
      new FontPreloadPlugin(),
      ...(isProduction ? [new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" })] : []),
    ],
  };
};
