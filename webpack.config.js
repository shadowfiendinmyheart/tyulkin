const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { DefinePlugin } = require("webpack");
const eng = require("./src/localization/dictionaries/eng.json");
const { OG_IMAGE, escapeXml, getOgImageAlt, renderOgImage } = require("./scripts/og-image.cjs");
const { getGitLog } = require("./scripts/git-log.cjs");
const { getGithubRepos } = require("./scripts/github-repos.cjs");
const pwa = require("./scripts/pwa.cjs");
const blog = require("./scripts/blog.cjs");
const { normalizeBasePath } = require("./scripts/base-path.cjs");

// static CV text for crawlers and no-JS visitors, taken from the dictionary (single source)
const toHtmlLines = (text) => escapeXml(text).split("\n").join("<br />");

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

// emits the link preview card (scripts/og-image.cjs) and, when the absolute site URL is known,
// the tags that need it: canonical, og:url, og:image (scrapers ignore a relative one)
class OgImagePlugin {
  constructor(siteUrl) {
    this.siteUrl = siteUrl;
  }

  apply(compiler) {
    const { RawSource } = compiler.webpack.sources;
    compiler.hooks.thisCompilation.tap("OgImagePlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "OgImagePlugin",
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          // drawn once: the texts are read at config load anyway (as for <noscript>)
          this.image = this.image || renderOgImage();
          compilation.emitAsset(OG_IMAGE.fileName, new RawSource(this.image));
        },
      );
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tap("OgImagePlugin", (data) => {
        const tag = (tagName, attributes) =>
          HtmlWebpackPlugin.createHtmlTagObject(tagName, attributes);
        const meta = (property, content) => tag("meta", { property, content });
        if (!this.siteUrl) {
          data.headTags.push(tag("meta", { name: "twitter:card", content: "summary" }));
          return data;
        }
        // 404.html is served for every deep link (/gui, /settings): it can't claim to be the root
        if (data.outputName === "index.html") {
          data.headTags.push(
            tag("link", { rel: "canonical", href: this.siteUrl }),
            meta("og:url", this.siteUrl),
          );
        }
        data.headTags.push(
          meta("og:image", this.siteUrl + OG_IMAGE.fileName),
          meta("og:image:type", "image/png"),
          meta("og:image:width", String(OG_IMAGE.width)),
          meta("og:image:height", String(OG_IMAGE.height)),
          meta("og:image:alt", getOgImageAlt()),
          tag("meta", { name: "twitter:card", content: "summary_large_image" }),
        );
        return data;
      });
    });
  }
}

// the installable app (scripts/pwa.cjs): the manifest with its icons, their tags in the page, and
// the service worker with the list of the emitted files to precache
class PwaPlugin {
  constructor(basePath) {
    this.basePath = basePath;
  }

  apply(compiler) {
    const { Compilation } = compiler.webpack;
    const { RawSource } = compiler.webpack.sources;
    compiler.hooks.thisCompilation.tap("PwaPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: "PwaPlugin", stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          // drawn once, like the og:image card
          this.icons =
            this.icons ||
            [...pwa.ICONS, pwa.APPLE_TOUCH_ICON].map((icon) => [
              icon.fileName,
              pwa.renderIcon(icon),
            ]);
          this.icons.forEach(([fileName, png]) =>
            compilation.emitAsset(fileName, new RawSource(png)),
          );
          compilation.emitAsset(
            pwa.MANIFEST_FILE,
            new RawSource(JSON.stringify(pwa.getManifest(this.basePath), null, 2)),
          );
        },
      );
      // after the HTML pages, minification and the real content hashes: the list holds the final files
      compilation.hooks.processAssets.tap(
        { name: "PwaPlugin", stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER },
        () => {
          const assets = compilation
            .getAssets()
            .map(({ name, source }) => ({ name, source: source.buffer() }));
          compilation.emitAsset(
            pwa.SERVICE_WORKER_FILE,
            new RawSource(pwa.getServiceWorker(assets)),
          );
        },
      );
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tap("PwaPlugin", (data) => {
        data.headTags.push(
          HtmlWebpackPlugin.createHtmlTagObject("link", {
            rel: "manifest",
            href: data.publicPath + pwa.MANIFEST_FILE,
          }),
          HtmlWebpackPlugin.createHtmlTagObject("link", {
            rel: "apple-touch-icon",
            href: data.publicPath + pwa.APPLE_TOUCH_ICON.fileName,
          }),
        );
        return data;
      });
    });
  }
}

// the blog (scripts/blog.cjs): a static page per post for search engines and, with the absolute
// site URL (RSS links must be absolute), the feed with its <link> in the page. No posts: nothing
class BlogPlugin {
  constructor({ posts, basePath, siteUrl }) {
    this.posts = posts;
    this.basePath = basePath;
    this.siteUrl = siteUrl;
    this.hasFeed = Boolean(siteUrl && posts.length);
  }

  apply(compiler) {
    const { RawSource } = compiler.webpack.sources;
    compiler.hooks.thisCompilation.tap("BlogPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: "BlogPlugin", stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          const options = { basePath: this.basePath, siteUrl: this.siteUrl, hasFeed: this.hasFeed };
          this.posts.forEach((post) =>
            compilation.emitAsset(
              blog.getPagePath(post.slug),
              new RawSource(blog.renderPostPage(post, options)),
            ),
          );
          if (this.hasFeed) {
            compilation.emitAsset(
              blog.FEED_FILE,
              new RawSource(blog.renderFeed(this.posts, this.siteUrl)),
            );
          }
        },
      );
      if (!this.hasFeed) return;
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tap("BlogPlugin", (data) => {
        data.headTags.push(
          HtmlWebpackPlugin.createHtmlTagObject("link", {
            rel: "alternate",
            type: "application/rss+xml",
            title: eng.blogFeedTitle,
            href: data.publicPath + blog.FEED_FILE,
          }),
        );
        return data;
      });
    });
  }
}

// cookieless analytics (Umami): its script, only when the website id is given; events are sent
// from src/analytics. data-domains keeps local and e2e runs of the published build out of the stats
class AnalyticsPlugin {
  constructor({ websiteId, scriptUrl, siteUrl }) {
    this.attributes = {
      src: scriptUrl,
      defer: true,
      "data-website-id": websiteId,
      // visitors with Do Not Track on are not counted
      "data-do-not-track": "true",
      "data-domains": new URL(siteUrl).hostname,
    };
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap("AnalyticsPlugin", (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tap("AnalyticsPlugin", (data) => {
        data.headTags.push(HtmlWebpackPlugin.createHtmlTagObject("script", this.attributes));
        return data;
      });
    });
  }
}

// UMAMI_WEBSITE_ID turns analytics on (the published build: a repository variable in ci.yml);
// UMAMI_SCRIPT_URL — for a self-hosted Umami, Umami Cloud by default. SITE_URL is required: without
// data-domains every local run of the build would be counted
const getAnalytics = (siteUrl) => {
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  if (!websiteId) return undefined;
  if (!siteUrl) throw new Error("UMAMI_WEBSITE_ID needs SITE_URL (the domain that is counted)");
  return {
    websiteId,
    siteUrl,
    scriptUrl: new URL(process.env.UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js").href,
  };
};

// the proxy of `ask` (TASK-71, ask-proxy/): ASK_PROXY_URL turns the command on (the published
// build: a repository variable in ci.yml); without it there is no `ask`. The dev server takes it
// too: `npx wrangler dev` runs the proxy locally
const getAskUrl = () => {
  const url = process.env.ASK_PROXY_URL;
  return url ? new URL(url).href : "";
};

// the absolute URL of the deployed site from SITE_URL (CI sets it for the published build), with a
// trailing slash; it must end with the base path the build is made for. Not set: no absolute tags
const getSiteUrl = (basePath) => {
  if (!process.env.SITE_URL) return undefined;
  const url = new URL(process.env.SITE_URL);
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  if (url.pathname !== basePath) {
    throw new Error(`SITE_URL path "${url.pathname}" doesn't match the base path "${basePath}"`);
  }
  return url.href;
};

// async: the GitHub repositories for `projects` are fetched before the build (only when listed)
module.exports = async (env, argv) => {
  const mode = argv.mode || "development";
  const isProduction = mode === "production";
  const devtool = isProduction ? false : "inline-source-map";
  // the site may live in a subpath (GitHub Pages project site): `webpack --env basePath=tyulkin`
  // (scripts/base-path.cjs); asset URLs and the router basename both come from it
  const basePath = normalizeBasePath(env.basePath);
  const siteUrl = isProduction ? getSiteUrl(basePath) : undefined;
  // the published site only: the dev server doesn't count visits
  const analytics = isProduction ? getAnalytics(siteUrl) : undefined;
  // GITHUB_REPOS lists them; without it nothing is fetched and `projects` shows the dictionary text.
  // Production builds only: the dev server starts without the network round-trip
  const githubRepos = isProduction ? await getGithubRepos() : [];
  // the owner's posts, content/*.md; read once: the dev server needs a restart for a new post
  const blogPosts = blog.readPosts();

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
      new DefinePlugin({
        __BASE_PATH__: JSON.stringify(basePath),
        // the commits for `changelog` as of the build; the dev server reads them once at start
        __GIT_LOG__: JSON.stringify(getGitLog()),
        // the repositories for `projects` as of the build (scripts/github-repos.cjs)
        __GITHUB_REPOS__: JSON.stringify(githubRepos),
        // the posts for `blog` and `read` (scripts/blog.cjs)
        __BLOG_POSTS__: JSON.stringify(blogPosts),
        __ASK_URL__: JSON.stringify(getAskUrl()),
        // the service worker is registered by the published build only (src/serviceWorker)
        __SERVICE_WORKER__: JSON.stringify(isProduction ? pwa.SERVICE_WORKER_FILE : ""),
      }),
      new FontPreloadPlugin(),
      // the card is for the published site: the dev server skips the render
      ...(isProduction ? [new OgImagePlugin(siteUrl)] : []),
      ...(isProduction ? [new BlogPlugin({ posts: blogPosts, basePath, siteUrl })] : []),
      ...(isProduction ? [new PwaPlugin(basePath)] : []),
      ...(analytics ? [new AnalyticsPlugin(analytics)] : []),
      ...(isProduction ? [new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" })] : []),
    ],
  };
};
