import { TFunction } from "../localization/interfaces";
import { LogNode } from "../store/console/interfaces";
import { linkify } from "../store/console/logNodes";

export type GithubRepo = (typeof __GITHUB_REPOS__)[number];

// the repositories the owner listed in GITHUB_REPOS, fetched at build time (scripts/github-repos.cjs)
export const githubRepos = __GITHUB_REPOS__;

// a header and a table "name  language  stars  description" of the GitHub repositories; without
// them (no GITHUB_REPOS, or the API was unavailable at build time) the owner's text from the dictionary
export const getProjects = (t: TFunction, repos: GithubRepo[]): LogNode[][] => {
  if (!repos.length) return [linkify(t({ key: "projects" }))];

  const rows = repos.map(({ name, url, description, language, stars }): LogNode[][] => [
    [{ type: "link", text: name, href: url }],
    language ? [{ type: "text", text: language, color: "muted" }] : [],
    [
      {
        type: "text",
        text: t({ key: "projectsStars", args: { stars: String(stars) } }),
        color: "accent",
      },
    ],
    // the owner's text: a URL in a description is a link, as in the dictionary text
    linkify(description),
  ]);
  return [[t({ key: "projectsGithub" })], [{ type: "table", rows }]];
};
