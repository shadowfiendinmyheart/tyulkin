// @vitest-environment node
// the build side of the blog (TASK-70); the posts here are test fixtures, not content of the site
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import blog from "./blog.cjs";

const post = (frontMatter, body = "Text") => `---\n${frontMatter}\n---\n\n${body}\n`;

describe("parseInline", () => {
  it("parses bold, italic, code, links and bare URLs", () => {
    expect(
      blog.parseInline(
        "**b** *i* _j_ `c` [l](https://a.example) see https://b.example/x. snake_case",
      ),
    ).toEqual([
      { type: "strong", text: "b" },
      { type: "text", text: " " },
      { type: "em", text: "i" },
      { type: "text", text: " " },
      { type: "em", text: "j" },
      { type: "text", text: " " },
      { type: "code", text: "c" },
      { type: "text", text: " " },
      { type: "link", text: "l", href: "https://a.example" },
      { type: "text", text: " see " },
      { type: "link", text: "https://b.example/x", href: "https://b.example/x" },
      { type: "text", text: ". snake_case" },
    ]);
  });

  it("shows unsafe and relative links as text, images as links", () => {
    expect(
      blog.parseInline("[x](javascript:alert) [y](/page) ![img](https://a.example/i.png)"),
    ).toEqual([
      { type: "text", text: "x y " },
      { type: "link", text: "img", href: "https://a.example/i.png" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("parses the blocks", () => {
    const source = [
      "# Title",
      "",
      "A paragraph",
      "on two lines",
      "- one",
      "  continued",
      "- two",
      "",
      "3. three",
      "> quote",
      "> more",
      "",
      "```js",
      "**not bold**",
      "```",
      "---",
    ].join("\n");
    expect(blog.parseMarkdown(source)).toEqual([
      { type: "heading", level: 1, inline: [{ type: "text", text: "Title" }] },
      { type: "paragraph", inline: [{ type: "text", text: "A paragraph on two lines" }] },
      {
        type: "list",
        ordered: false,
        start: 1,
        items: [[{ type: "text", text: "one continued" }], [{ type: "text", text: "two" }]],
      },
      { type: "list", ordered: true, start: 3, items: [[{ type: "text", text: "three" }]] },
      { type: "quote", inline: [{ type: "text", text: "quote more" }] },
      { type: "code", text: "**not bold**" },
      { type: "rule" },
    ]);
  });
});

describe("edge cases", () => {
  it("keeps a # that ends a word in a heading", () => {
    expect(blog.parseMarkdown("## Why C# ##")).toEqual([
      { type: "heading", level: 2, inline: [{ type: "text", text: "Why C#" }] },
    ]);
  });

  it("keeps parentheses of a URL", () => {
    expect(blog.parseInline("[Rust](https://a.example/Rust_(language))")).toEqual([
      { type: "link", text: "Rust", href: "https://a.example/Rust_(language)" },
    ]);
  });

  it("leaves double underscores inside a word alone", () => {
    expect(blog.parseInline("my__init__x")).toEqual([{ type: "text", text: "my__init__x" }]);
  });

  it("doesn't close a code block by a fence with an info string", () => {
    expect(blog.parseMarkdown("````md\n```bash\nls\n```\n````")).toEqual([
      { type: "code", text: "```bash\nls\n```" },
    ]);
  });
});

describe("readPost", () => {
  it("reads the front matter", () => {
    expect(
      blog.readPost(
        "a-post.md",
        "﻿" + post('title: "A: post"\r\ndate: 2026-10-13\r\ndescription: About\r\nlang: ru'),
      ),
    ).toEqual({
      slug: "a-post",
      title: "A: post",
      date: "2026-10-13",
      description: "About",
      lang: "ru",
      blocks: [{ type: "paragraph", inline: [{ type: "text", text: "Text" }] }],
    });
  });

  it.each([
    ["Bad_Name.md", post("title: T\ndate: 2026-10-13"), /file name/],
    ["a.md", "No front matter", /no front matter/],
    ["a.md", post("date: 2026-10-13"), /no title/],
    ["a.md", post("title: T\ndate: 2026-02-30"), /date/],
    ["a.md", post("title: T\ndate: 2026-13-01"), /date/],
    ["a.md", post("title: T\ndate: 2026-10-13\nlang: de"), /lang/],
    ["a.md", post("title: T\ndate: 2026-10-13\nauthor: X"), /unknown front matter key/],
    ["a.md", post("title: T\ndate: 2026-10-13", ""), /empty/],
  ])("fails the build for a broken post %s", (file, source, error) => {
    expect(() => blog.readPost(file, source)).toThrow(error);
  });
});

describe("readPosts", () => {
  let dir;
  afterEach(() => dir && fs.rmSync(dir, { recursive: true, force: true }));

  it("has no posts without the directory", () => {
    expect(blog.readPosts(path.join(os.tmpdir(), "no-such-blog-dir"))).toEqual([]);
  });

  it("reads the posts newest first, only .md files", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-"));
    fs.writeFileSync(path.join(dir, "old.md"), post("title: Old\ndate: 2025-01-01"));
    fs.writeFileSync(path.join(dir, "new.md"), post("title: New\ndate: 2026-01-01"));
    fs.writeFileSync(path.join(dir, "notes.txt"), "not a post");
    expect(blog.readPosts(dir).map(({ slug }) => slug)).toEqual(["new", "old"]);
  });
});

describe("the static page and the feed", () => {
  const fixture = blog.readPost(
    "a-post.md",
    post("title: A <post>\ndate: 2026-10-13\ndescription: About", "Some **text**"),
  );

  it("renders the page under the base path, escaped", () => {
    const html = blog.renderPostPage(fixture, {
      basePath: "/tyulkin/",
      siteUrl: "https://owner.example/tyulkin/",
      hasFeed: true,
    });
    expect(html).toContain("<h1>A &lt;post&gt;</h1>");
    expect(html).toContain("<p>Some <strong>text</strong></p>");
    expect(html).toContain('href="/tyulkin/?cmd=blog"');
    expect(html).toContain('href="/tyulkin/?cmd=read+a-post"');
    expect(html).toContain('href="/tyulkin/rss.xml"');
    expect(html).toContain(
      '<link rel="canonical" href="https://owner.example/tyulkin/posts/a-post.html" />',
    );
  });

  it("has no absolute tags without the site URL", () => {
    const html = blog.renderPostPage(fixture, { basePath: "/", hasFeed: false });
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("rss.xml");
  });

  it("renders the feed with absolute links", () => {
    const xml = blog.renderFeed([fixture], "https://owner.example/tyulkin/");
    expect(xml).toContain("<link>https://owner.example/tyulkin/posts/a-post.html</link>");
    expect(xml).toContain("<pubDate>Tue, 13 Oct 2026 00:00:00 GMT</pubDate>");
    expect(xml).toContain("&lt;p&gt;Some &lt;strong&gt;text&lt;/strong&gt;&lt;/p&gt;");
  });
});
