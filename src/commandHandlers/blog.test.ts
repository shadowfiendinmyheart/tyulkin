import { describe, expect, it } from "vitest";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import { BlogPost, blogPosts, getBlogList, getBlogPost } from "./blog";

const t = createT(eng);

// test fixtures: the site has no posts of its own until the owner writes them
const posts: BlogPost[] = [
  {
    slug: "second-post",
    title: "Second post",
    date: "2026-10-13",
    description: "What it is about",
    lang: "en",
    blocks: [
      { type: "heading", level: 2, inline: [{ type: "text", text: "A heading" }] },
      {
        type: "paragraph",
        inline: [
          { type: "text", text: "Plain, " },
          { type: "strong", text: "bold" },
          { type: "text", text: ", " },
          { type: "em", text: "italic" },
          { type: "text", text: ", " },
          { type: "code", text: "code" },
          { type: "text", text: " and " },
          { type: "link", text: "a link", href: "https://example.com" },
        ],
      },
      {
        type: "list",
        ordered: true,
        start: 3,
        items: [[{ type: "text", text: "three" }], [{ type: "text", text: "four" }]],
      },
      { type: "list", ordered: false, start: 1, items: [[{ type: "text", text: "item" }]] },
      { type: "code", text: "const a = 1;\nconst b = 2;" },
      { type: "quote", inline: [{ type: "text", text: "quoted" }] },
      { type: "rule" },
    ],
  },
  {
    slug: "first-post",
    title: "First post",
    date: "2026-01-02",
    description: "",
    lang: "ru",
    blocks: [{ type: "paragraph", inline: [{ type: "text", text: "Text" }] }],
  },
];

describe("blog (TASK-70)", () => {
  it("has no posts in a build without content/", () => {
    expect(blogPosts).toEqual([]);
    expect(getBlogList(t, blogPosts)).toEqual([
      { type: "text", text: eng.blogEmpty, color: "muted" },
    ]);
  });

  it("lists the posts with titles that run read", () => {
    expect(getBlogList(t, posts)).toEqual([
      eng.blogList,
      {
        type: "table",
        rows: [
          [
            [{ type: "text", text: "2026-10-13", color: "muted" }],
            [{ type: "command", command: "read second-post", label: "Second post" }],
            ["What it is about"],
          ],
          [
            [{ type: "text", text: "2026-01-02", color: "muted" }],
            [{ type: "command", command: "read first-post", label: "First post" }],
            [],
          ],
        ],
      },
    ]);
  });

  it("renders a post as logs, the slug in any case", () => {
    expect(getBlogPost(t, posts, "Second-Post")).toEqual([
      { type: "text", text: "Second post", color: "accent" },
      { type: "text", text: "2026-10-13", color: "muted" },
      [
        { type: "text", text: "## ", color: "accent" },
        { type: "text", text: "A heading", color: "accent" },
      ],
      [
        "Plain, ",
        { type: "text", text: "bold", color: "accent" },
        ", ",
        "italic",
        ", ",
        { type: "text", text: "code", color: "muted" },
        " and ",
        { type: "link", text: "a link", href: "https://example.com" },
      ],
      ["3. ", "three"],
      ["4. ", "four"],
      ["• ", "item"],
      { type: "pre", text: "const a = 1;\nconst b = 2;" },
      [{ type: "text", text: "│ ", color: "muted" }, "quoted"],
      { type: "text", text: "────────", color: "muted" },
    ]);
  });

  it("tells how to use read without a post", () => {
    expect(getBlogPost(t, posts, undefined)).toEqual([
      [
        "Which post? Type read <post>; the posts are listed by ",
        { type: "command", command: "blog" },
      ],
    ]);
  });

  it("keeps an unknown slug as plain text", () => {
    expect(getBlogPost(t, posts, "$blog")).toEqual([
      ["No post $blog. The posts are listed by ", { type: "command", command: "blog" }],
    ]);
  });
});
