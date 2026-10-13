import { TFunction } from "../localization/interfaces";
import { LogContent } from "../store/console/interfaces";
import { linkify } from "../store/console/logNodes";
import { getProjects, githubRepos } from "./projects";

// the sections of the CV, as logs: printed by their commands (`about`) and by `cat` of their
// files (`cat about.md`, TASK-60)
export const sections = {
  about: (t) => [t({ key: "about" })],
  contacts: (t) => [linkify(t({ key: "contacts" }))],
  education: (t) => [t({ key: "education" })],
  experience: (t) => [t({ key: "experience" })],
  // the GitHub repositories from the build, or the dictionary text (TASK-68)
  projects: (t) => getProjects(t, githubRepos),
  skills: (t) => [t({ key: "skills" })],
} satisfies Record<string, (t: TFunction) => LogContent[]>;
