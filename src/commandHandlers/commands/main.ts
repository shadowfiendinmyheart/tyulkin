import { ROUTES } from "../../router/const";
import { GuiLocationState } from "../../router/interfaces";
import { withNodes } from "../../store/console/logNodes";
import { ask, askUrl } from "../ask";
import { blogPosts, getBlogList, getBlogPost } from "../blog";
import { changes, getChangelog } from "../changelog";
import { Command } from "../interfaces";
import { sections } from "../sections";

// the AI assistant about the owner (TASK-71): listed only in a build with its proxy (ASK_PROXY_URL)
export const askCommand: Command = {
  name: "ask",
  anyArgs: true,
  descriptionKey: "helpAsk",
  // every answer is paid for: a link must not ask on the recipient's behalf
  shareable: false,
  linkable: false,
  run: ({ log, fail, t, language }, args) =>
    void ask({ url: askUrl, question: args.join(" "), language, log, fail, t }),
};

export const mainCommands: Command[] = [
  {
    name: "education",
    descriptionKey: "helpEducation",
    run: ({ log, t }) => sections.education(t).forEach((content) => log(content)),
  },
  {
    name: "about",
    descriptionKey: "helpAbout",
    run: ({ log, t }) => sections.about(t).forEach((content) => log(content)),
  },
  {
    name: "experience",
    descriptionKey: "helpExperience",
    run: ({ log, t }) => sections.experience(t).forEach((content) => log(content)),
  },
  {
    name: "skills",
    descriptionKey: "helpSkills",
    run: ({ log, t }) => sections.skills(t).forEach((content) => log(content)),
  },
  {
    name: "projects",
    descriptionKey: "helpProjects",
    run: ({ log, t }) => sections.projects(t).forEach((content) => log(content)),
  },
  {
    name: "contacts",
    descriptionKey: "helpContacts",
    run: ({ log, t }) => sections.contacts(t).forEach((content) => log(content)),
  },
  {
    // the CV is saved as PDF by printing its regular (gui) view; opening the view alone is `gui`
    name: "cv",
    params: ["--download"],
    descriptionKey: "helpCv",
    run: ({ log, t, navigate }, [param]) => {
      if (param?.toLowerCase() !== "--download") {
        log(
          withNodes(
            ([download, gui]) => t({ key: "cvUsage", args: { download, gui } }),
            [
              { type: "command", command: "cv --download" },
              { type: "command", command: "gui" },
            ],
          ),
        );
        return;
      }
      const state: GuiLocationState = { print: true };
      navigate(ROUTES.GUI, { state });
    },
  },
  {
    // the history of the site from its commits (TASK-69)
    name: "changelog",
    params: ["--all"],
    descriptionKey: "helpChangelog",
    run: ({ log, t }, [param]) =>
      getChangelog(t, changes, param?.toLowerCase() === "--all").forEach((content) => log(content)),
  },
  {
    // the owner's posts (TASK-70), compiled at build time; "No posts yet" without them
    name: "blog",
    descriptionKey: "helpBlog",
    run: ({ log, t }) => getBlogList(t, blogPosts).forEach((content) => log(content)),
  },
  {
    name: "read",
    // Tab completes the slugs of the posts
    params: blogPosts.map(({ slug }) => slug),
    descriptionKey: "helpRead",
    run: ({ log, fail, t }, [slug]) => {
      getBlogPost(t, blogPosts, slug).forEach((content) => log(content));
      if (slug && !blogPosts.some((post) => post.slug === slug.toLowerCase())) fail();
    },
  },
  ...(askUrl ? [askCommand] : []),
  {
    // `cd settings` too (commands/fileSystem.ts)
    name: "settings",
    descriptionKey: "helpSettings",
    shareable: false,
    run: ({ navigate }) => navigate(ROUTES.SETTINGS),
  },
];
