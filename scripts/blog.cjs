// The blog (TASK-70): posts are content/*.md written by the owner, compiled at build time. Here they
// are read, checked and parsed into blocks (a small Markdown subset); the terminal renders the blocks
// as logs (src/commandHandlers/blog.ts, `blog` and `read <slug>`), and the build renders them as a
// static page per post (posts/<slug>.html, for search engines) and the RSS feed (rss.xml).
// No content/ or no posts in it: no posts, no pages and no feed; `blog` says there are none yet.
//
// A post: content/<slug>.md, the slug is lowercase latin letters, digits and dashes:
//
//   ---
//   title: The title
//   date: 2026-10-13
//   description: One line for the list of posts, the feed and search engines (optional)
//   lang: en (or ru; the language of the post, en by default)
//   ---
//
//   The text: paragraphs, # headings, - and 1. lists, > quotes, ``` code blocks, --- rules;
//   in a line: **bold**, *italic*, `code`, [links](https://…) and bare https:// URLs. Only absolute
//   http(s) and mailto links are links: anything else is shown as its text.
const fs = require("fs");
const path = require("path");

const CONTENT_DIR = path.join(__dirname, "..", "content");
const PAGES_DIR = "posts";
const FEED_FILE = "rss.xml";

const SLUG_REGEXP = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_REGEXP = /^\d{4}-\d{2}-\d{2}$/;
// html lang of a post -> the site dictionary of its language (src/localization/dictionaries)
const DICTIONARY_BY_LANG = { en: "eng", ru: "ru" };
const FRONT_MATTER_KEYS = ["title", "date", "description", "lang"];

// ---------- Markdown → blocks ----------

const isSafeHref = (href) => /^(https?:\/\/|mailto:)/i.test(href);

// a URL runs up to the next whitespace; trailing punctuation is left out of it
const URL_REGEXP = /https?:\/\/[^\s<>]*[^\s<>.,;:!?'")\]]/g;

// bare URLs of a text become links
const autolink = (text) => {
  const nodes = [];
  let start = 0;
  for (const { 0: url, index } of text.matchAll(URL_REGEXP)) {
    if (index > start) nodes.push({ type: "text", text: text.slice(start, index) });
    nodes.push({ type: "link", text: url, href: url });
    start = index + url.length;
  }
  if (start < text.length) nodes.push({ type: "text", text: text.slice(start) });
  return nodes;
};

// escapes, code, images and links (shown as links), bold, italic; no nesting: the inner text of
// bold, italic and links is taken as is. A URL may hold pairs of parentheses (Rust_(language)),
// and underscores inside a word (snake_case, my__init__x) are not emphasis
const INLINE_REGEXP =
  /\\([\\`*_[\]()!#>+.-])|`([^`]+)`|(!?)\[([^\]]*)\]\(\s*<?((?:[^()\s>]|\([^()\s]*\))*)>?(?:\s+"[^"]*")?\s*\)|\*\*(?=\S)(.+?)\*\*|(?<![\p{L}\p{N}_])__(?=\S)(.+?)__(?![\p{L}\p{N}_])|\*(?=\S)([^*]+?)\*|(?<![\p{L}\p{N}_])_(?=\S)([^_]+?)_(?![\p{L}\p{N}_])/gu;

// a line of text -> [{ type: "text" | "strong" | "em" | "code", text } | { type: "link", text, href }]
const parseInline = (source) => {
  const nodes = [];
  const pushText = (text) => {
    const last = nodes[nodes.length - 1];
    if (last && last.type === "text") last.text += text;
    else if (text) nodes.push({ type: "text", text });
  };
  let start = 0;
  for (const match of source.matchAll(INLINE_REGEXP)) {
    const [, escaped, code, image, label, href, strong, strongAlt, em, emAlt] = match;
    // the text before the match may hold bare URLs
    autolink(source.slice(start, match.index)).forEach((node) =>
      node.type === "text" ? pushText(node.text) : nodes.push(node),
    );
    start = match.index + match[0].length;
    if (escaped !== undefined) pushText(escaped);
    else if (code !== undefined) nodes.push({ type: "code", text: code });
    else if (label !== undefined) {
      const text = label || href;
      if (isSafeHref(href)) nodes.push({ type: "link", text, href });
      else pushText(image ? label : text);
    } else if (strong !== undefined || strongAlt !== undefined)
      nodes.push({ type: "strong", text: strong ?? strongAlt });
    else nodes.push({ type: "em", text: em ?? emAlt });
  }
  autolink(source.slice(start)).forEach((node) =>
    node.type === "text" ? pushText(node.text) : nodes.push(node),
  );
  return nodes;
};

const FENCE_REGEXP = /^\s{0,3}(```+|~~~+)\s*([\w+-]*)\s*$/;
// the closing #s go only after a space: "C#" keeps its #
const HEADING_REGEXP = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const RULE_REGEXP = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE_REGEXP = /^\s{0,3}>\s?(.*)$/;
const LIST_ITEM_REGEXP = /^\s{0,3}(?:([-*+])|(\d{1,9})[.)])\s+(.*)$/;

// the text of a post -> [{ type: "heading", level, inline } | { type: "paragraph", inline } |
// { type: "list", ordered, start, items: inline[] } | { type: "code", text } |
// { type: "quote", inline } | { type: "rule" }]; the types are BlogBlock in src/global.d.ts
const parseMarkdown = (source) => {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  const isBlockStart = (line) =>
    FENCE_REGEXP.test(line) ||
    HEADING_REGEXP.test(line) ||
    RULE_REGEXP.test(line) ||
    QUOTE_REGEXP.test(line) ||
    LIST_ITEM_REGEXP.test(line);
  const joinLines = (parts) =>
    parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }

    const fence = FENCE_REGEXP.exec(line);
    if (fence) {
      const code = [];
      index++;
      // closed by a line of the fence characters only, at least as many (a ```bash inside is
      // code); an unclosed block runs to the end, as in CommonMark
      const closing = new RegExp(`^\\s{0,3}${fence[1][0]}{${fence[1].length},}\\s*$`);
      while (index < lines.length && !closing.test(lines[index])) {
        code.push(lines[index]);
        index++;
      }
      index++;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = HEADING_REGEXP.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, inline: parseInline(heading[2]) });
      index++;
      continue;
    }

    if (RULE_REGEXP.test(line)) {
      blocks.push({ type: "rule" });
      index++;
      continue;
    }

    if (QUOTE_REGEXP.test(line)) {
      const quoted = [];
      while (index < lines.length && QUOTE_REGEXP.test(lines[index])) {
        quoted.push(QUOTE_REGEXP.exec(lines[index])[1]);
        index++;
      }
      blocks.push({ type: "quote", inline: parseInline(joinLines(quoted)) });
      continue;
    }

    const firstItem = LIST_ITEM_REGEXP.exec(line);
    if (firstItem) {
      const ordered = firstItem[2] !== undefined;
      const items = [];
      while (index < lines.length) {
        const item = LIST_ITEM_REGEXP.exec(lines[index]);
        if (item && (item[2] !== undefined) === ordered) {
          items.push([item[3]]);
        } else if (item || !lines[index].trim() || !/^\s/.test(lines[index])) {
          // another kind of list, a blank line or an unindented line ends the list
          break;
        } else {
          // an indented line continues the item
          items[items.length - 1].push(lines[index]);
        }
        index++;
      }
      blocks.push({
        type: "list",
        ordered,
        start: ordered ? Number(firstItem[2]) : 1,
        items: items.map((parts) => parseInline(joinLines(parts))),
      });
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push({ type: "paragraph", inline: parseInline(joinLines(paragraph)) });
  }
  return blocks;
};

// ---------- content/*.md → posts ----------

// "---\nkey: value\n---\n" at the start of the file -> { data, body }
const parseFrontMatter = (source, file) => {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
  if (!match) throw new Error(`blog: ${file}: no front matter (--- title, date --- at the start)`);
  const data = {};
  match[1].split("\n").forEach((line) => {
    if (!line.trim()) return;
    const field = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!field) throw new Error(`blog: ${file}: wrong front matter line "${line}"`);
    const [, key, raw] = field;
    if (!FRONT_MATTER_KEYS.includes(key)) {
      throw new Error(`blog: ${file}: unknown front matter key "${key}" (${FRONT_MATTER_KEYS})`);
    }
    // a value may be quoted, for a colon or a leading dash
    const quoted = /^(["'])(.*)\1$/.exec(raw.trim());
    data[key] = quoted ? quoted[2] : raw.trim();
  });
  return { data, body: source.slice(match[0].length) };
};

// the date must be a real one: 2026-02-30 is a typo
const isValidDate = (date) => {
  if (!DATE_REGEXP.test(date)) return false;
  // 2026-13-01 is no date at all: toISOString would throw
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
};

const readPost = (file, source) => {
  const slug = path.basename(file, ".md");
  if (!SLUG_REGEXP.test(slug)) {
    throw new Error(
      `blog: ${file}: the file name must be lowercase latin letters, digits and dashes`,
    );
  }
  const { data, body } = parseFrontMatter(
    source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"),
    file,
  );
  if (!data.title) throw new Error(`blog: ${file}: no title`);
  if (!isValidDate(data.date || "")) throw new Error(`blog: ${file}: the date must be YYYY-MM-DD`);
  const lang = data.lang || "en";
  if (!DICTIONARY_BY_LANG[lang]) {
    throw new Error(`blog: ${file}: lang must be one of ${Object.keys(DICTIONARY_BY_LANG)}`);
  }
  const blocks = parseMarkdown(body);
  if (!blocks.length) throw new Error(`blog: ${file}: the post is empty`);
  return {
    slug,
    title: data.title,
    date: data.date,
    description: data.description || "",
    lang,
    blocks,
  };
};

// the posts of a directory, newest first; none without the directory. A broken post fails the
// build: it would be silently missing otherwise
const readPosts = (dir = CONTENT_DIR) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readPost(name, fs.readFileSync(path.join(dir, name), "utf8")))
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
};

// ---------- blocks → HTML: the static pages and the feed ----------

const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inlineToHtml = (inline) =>
  inline
    .map((node) => {
      const text = escapeHtml(node.text);
      switch (node.type) {
        case "strong":
          return `<strong>${text}</strong>`;
        case "em":
          return `<em>${text}</em>`;
        case "code":
          return `<code>${text}</code>`;
        case "link":
          return `<a href="${escapeHtml(node.href)}" rel="noopener noreferrer">${text}</a>`;
        default:
          return text;
      }
    })
    .join("");

// the title of the page is its <h1>, so the headings of a post start from <h2>
const blocksToHtml = (blocks) =>
  blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const level = Math.min(block.level + 1, 6);
          return `<h${level}>${inlineToHtml(block.inline)}</h${level}>`;
        }
        case "list": {
          const items = block.items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("");
          if (!block.ordered) return `<ul>${items}</ul>`;
          return block.start === 1
            ? `<ol>${items}</ol>`
            : `<ol start="${block.start}">${items}</ol>`;
        }
        case "code":
          return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
        case "quote":
          return `<blockquote><p>${inlineToHtml(block.inline)}</p></blockquote>`;
        case "rule":
          return "<hr />";
        default:
          return `<p>${inlineToHtml(block.inline)}</p>`;
      }
    })
    .join("\n");

const getPagePath = (slug) => `${PAGES_DIR}/${slug}.html`;

const loadDictionary = (lang) =>
  require(`../src/localization/dictionaries/${DICTIONARY_BY_LANG[lang]}.json`);

// the colors of the default themes (src/styles/themes.scss): Black, White on a light system
const PAGE_STYLE = `
:root { color-scheme: dark light; --bg: #000; --text: #ccc; --muted: #888; --accent: #5fafff; }
@media (prefers-color-scheme: light) {
  :root { --bg: #fff; --text: #222; --muted: #767676; --accent: #0057b8; }
}
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 "IBM Plex Mono", ui-monospace, monospace; }
main { max-width: 72ch; margin: 0 auto; padding: 16px; }
a { color: var(--accent); }
h1, h2, h3, h4, h5, h6 { color: var(--accent); line-height: 1.3; }
time, nav, footer, blockquote { color: var(--muted); }
blockquote { margin: 0; padding-left: 1em; border-left: 2px solid var(--muted); }
pre { overflow-x: auto; padding: 8px; border: 1px solid var(--muted); }
hr { border: 0; border-top: 1px solid var(--muted); }
`.trim();

// a deep link into the terminal: its home page runs the command (COMMAND_PARAM, src/router/const.ts)
const getTerminalHref = (basePath, command) =>
  `${basePath}?${new URLSearchParams({ cmd: command })}`;

// a post as a regular page, for search engines and those who follow a link to it; the links lead
// into the terminal (`blog` and `read <slug>`) under the base path the site lives in
const renderPostPage = (post, { basePath, siteUrl, hasFeed }) => {
  const t = loadDictionary(post.lang);
  const description = post.description || post.title;
  const pageTitle = `${post.title} — ${t.blogFeedTitle}`;
  const absoluteTags = siteUrl
    ? [
        `<link rel="canonical" href="${escapeHtml(siteUrl + getPagePath(post.slug))}" />`,
        `<meta property="og:type" content="article" />`,
        `<meta property="og:title" content="${escapeHtml(post.title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:url" content="${escapeHtml(siteUrl + getPagePath(post.slug))}" />`,
        `<meta property="article:published_time" content="${post.date}" />`,
      ]
    : [];
  const feedTag = hasFeed
    ? [
        `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(t.blogFeedTitle)}" href="${basePath}${FEED_FILE}" />`,
      ]
    : [];
  const terminalHref = getTerminalHref(basePath, `read ${post.slug}`);
  return `<!doctype html>
<html lang="${post.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${[...absoluteTags, ...feedTag].join("\n    ")}
    <style>
${PAGE_STYLE}
    </style>
  </head>
  <body>
    <main>
      <nav><a href="${escapeHtml(getTerminalHref(basePath, "blog"))}">${escapeHtml(t.blogPageAllPosts)}</a></nav>
      <article>
        <h1>${escapeHtml(post.title)}</h1>
        <time datetime="${post.date}">${post.date}</time>
${blocksToHtml(post.blocks)}
      </article>
      <footer><p><a href="${escapeHtml(terminalHref)}">${escapeHtml(t.blogPageTerminal)}</a></p></footer>
    </main>
  </body>
</html>
`;
};

// "2026-10-13" -> "Tue, 13 Oct 2026 00:00:00 GMT" (RFC 822, as RSS wants)
const toRssDate = (date) => new Date(`${date}T00:00:00Z`).toUTCString();

// RSS 2.0 of all posts; links must be absolute, so only with the site URL
const renderFeed = (posts, siteUrl) => {
  const t = loadDictionary("en");
  const items = posts.map((post) => {
    const url = escapeHtml(siteUrl + getPagePath(post.slug));
    return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${toRssDate(post.date)}</pubDate>
      <description>${escapeHtml(blocksToHtml(post.blocks))}</description>
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(t.blogFeedTitle)}</title>
    <link>${escapeHtml(siteUrl)}</link>
    <description>${escapeHtml(t.blogFeedDescription)}</description>
    <atom:link href="${escapeHtml(siteUrl + FEED_FILE)}" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>
`;
};

module.exports = {
  FEED_FILE,
  PAGES_DIR,
  getPagePath,
  parseInline,
  parseMarkdown,
  readPost,
  readPosts,
  renderFeed,
  renderPostPage,
};
