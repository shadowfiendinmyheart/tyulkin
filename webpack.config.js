const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const eng = require("./src/localization/dictionaries/eng.json");

// static CV text for crawlers and no-JS visitors, taken from the dictionary (single source)
const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const toHtmlLines = (text) => escapeHtml(text).split("\n").join("<br />");

module.exports = (env, argv) => {
  const mode = argv.mode || "development";
  const isProduction = mode === "production";
  const devtool = isProduction ? false : "inline-source-map";

  return {
    mode,
    entry: "./src/main.tsx",
    devtool,
    output: {
      path: path.join(__dirname, "/dist"),
      // content hash in production for cache busting; stable names keep dev simple
      filename: isProduction ? "[name].[contenthash].js" : "[name].js",
      // absolute asset URLs so nested routes served via historyApiFallback (/settings/foo) still load
      publicPath: "/",
      clean: true,
    },
    devServer: {
      historyApiFallback: true,
    },
    module: {
      rules: [
        {
          test: /\.(css|scss)$/,
          // extracted CSS in production avoids FOUC; style-loader in dev for HMR
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "sass-loader",
          ],
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
      new HtmlWebpackPlugin({
        template: "./src/index.html",
        templateParameters: {
          about: toHtmlLines(eng.about),
          education: toHtmlLines(eng.education),
        },
      }),
      ...(isProduction ? [new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" })] : []),
    ],
  };
};
