import { describe, expect, it } from "vitest";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import { linkify } from "../store/console/logNodes";
import { getProjects, GithubRepo, githubRepos } from "./projects";

const t = createT(eng);

describe("getProjects (TASK-68)", () => {
  it("shows the dictionary text when the build has no repositories", () => {
    expect(githubRepos).toEqual([]);
    expect(getProjects(t, githubRepos)).toEqual([linkify(eng.projects)]);
  });

  it("lists the repositories from the build as a table", () => {
    const repos: GithubRepo[] = [
      {
        name: "first",
        url: "https://github.com/owner/first",
        description: "The first one",
        language: "TypeScript",
        stars: 3,
      },
      {
        name: "second",
        url: "https://github.com/owner/second",
        description: "",
        language: "",
        stars: 0,
      },
    ];
    expect(getProjects(t, repos)).toEqual([
      [eng.projectsGithub],
      [
        {
          type: "table",
          rows: [
            [
              [{ type: "link", text: "first", href: "https://github.com/owner/first" }],
              [{ type: "text", text: "TypeScript", color: "muted" }],
              [{ type: "text", text: "★ 3", color: "accent" }],
              ["The first one"],
            ],
            [
              [{ type: "link", text: "second", href: "https://github.com/owner/second" }],
              [],
              [{ type: "text", text: "★ 0", color: "accent" }],
              [],
            ],
          ],
        },
      ],
    ]);
  });
});
