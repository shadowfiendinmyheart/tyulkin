import { TFunction } from "../localization/interfaces";
import { LogContent, LogNode } from "../store/console/interfaces";
import { withNode } from "../store/console/logNodes";

// the blog (TASK-70): the owner's posts, content/*.md compiled at build time (scripts/blog.cjs)

export type BlogPost = (typeof __BLOG_POSTS__)[number];

// newest first; none without content/
export const blogPosts = __BLOG_POSTS__;

const blogCommandNode: LogNode = { type: "command", command: "blog" };

// the terminal has colors, not fonts: bold is accented, italic is plain, code is muted
const inlineToNodes = (inline: BlogInline): LogNode[] =>
  inline.map((node): LogNode => {
    switch (node.type) {
      case "link":
        return { type: "link", text: node.text, href: node.href };
      case "strong":
        return { type: "text", text: node.text, color: "accent" };
      case "code":
        return { type: "text", text: node.text, color: "muted" };
      default:
        return node.text;
    }
  });

// a block -> its lines; a list item is a line of its own
const blockToLogs = (block: BlogBlock): LogContent[] => {
  switch (block.type) {
    case "heading":
      // accented, its links and code kept as in a paragraph
      return [
        [
          { type: "text", text: `${"#".repeat(block.level)} `, color: "accent" },
          ...inlineToNodes(block.inline).map((node): LogNode =>
            typeof node === "string" ? { type: "text", text: node, color: "accent" } : node,
          ),
        ],
      ];
    case "list":
      return block.items.map((item, index) => [
        block.ordered ? `${block.start + index}. ` : "• ",
        ...inlineToNodes(item),
      ]);
    case "code":
      return [{ type: "pre", text: block.text }];
    case "quote":
      return [[{ type: "text", text: "│ ", color: "muted" }, ...inlineToNodes(block.inline)]];
    case "rule":
      return [{ type: "text", text: "────────", color: "muted" }];
    default:
      return [inlineToNodes(block.inline)];
  }
};

// `blog`: a table "date  title  description", a click on a title runs `read <slug>`
export const getBlogList = (t: TFunction, posts: BlogPost[]): LogContent[] => {
  if (!posts.length) return [{ type: "text", text: t({ key: "blogEmpty" }), color: "muted" }];

  const rows = posts.map(({ slug, title, date, description }): LogNode[][] => [
    [{ type: "text", text: date, color: "muted" }],
    [{ type: "command", command: `read ${slug}`, label: title }],
    description ? [description] : [],
  ]);
  return [t({ key: "blogList" }), { type: "table", rows }];
};

// `read <slug>`: the title, the date and the text of a post; slugs are lowercase, the visitor may
// type them in any case
export const getBlogPost = (
  t: TFunction,
  posts: BlogPost[],
  typed: string | undefined,
): LogContent[] => {
  if (!typed) {
    return [withNode((blog) => t({ key: "readUsage", args: { blog } }), blogCommandNode)];
  }
  const post = posts.find(({ slug }) => slug === typed.toLowerCase());
  if (!post) {
    // the slug is the visitor's: plain text
    return [
      withNode((blog) => t({ key: "readNotFound", args: { slug: typed, blog } }), blogCommandNode),
    ];
  }
  return [
    { type: "text", text: post.title, color: "accent" },
    { type: "text", text: post.date, color: "muted" },
    ...post.blocks.flatMap(blockToLogs),
  ];
};
