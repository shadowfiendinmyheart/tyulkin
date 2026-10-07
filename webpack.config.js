const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const eng = require("./src/localization/dictionaries/eng.json");

// static CV text for crawlers and no-JS visitors, taken from the dictionary (single source)
const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const toHtmlLines = (text) => escapeHtml(text).split("\n").join("<br />");

module.exports = (env, argv) => ({
  mode: argv.mode || "development",
  entry: "./src/main.tsx",
  devtool: argv.mode === "production" ? false : "inline-source-map",
  output: {
    path: path.join(__dirname, "/dist"),
    filename: "bundle.js",
  },
  devServer: {
    static: "./dist",
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.(css|scss)$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.ts$|tsx/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".jsx", ".ts", ".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      templateParameters: {
        about: toHtmlLines(eng.about),
        education: toHtmlLines(eng.education),
      },
    }),
  ],
});
