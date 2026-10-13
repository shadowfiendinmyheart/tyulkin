import { ROUTES } from "../../router/const";
import { GuiLocationState } from "../../router/interfaces";
import { linkify, withNodes } from "../../store/console/logNodes";
import { changes, getChangelog } from "../changelog";
import { Command } from "../interfaces";
import { getProjects, githubRepos } from "../projects";

export const mainCommands: Command[] = [
  {
    name: "education",
    descriptionKey: "helpEducation",
    run: ({ log, t }) => log(t({ key: "education" })),
  },
  {
    name: "about",
    descriptionKey: "helpAbout",
    run: ({ log, t }) => log(t({ key: "about" })),
  },
  {
    name: "experience",
    descriptionKey: "helpExperience",
    run: ({ log, t }) => log(t({ key: "experience" })),
  },
  {
    name: "skills",
    descriptionKey: "helpSkills",
    run: ({ log, t }) => log(t({ key: "skills" })),
  },
  {
    name: "projects",
    descriptionKey: "helpProjects",
    // the GitHub repositories from the build, or the dictionary text (TASK-68)
    run: ({ log, t }) => getProjects(t, githubRepos).forEach((content) => log(content)),
  },
  {
    name: "contacts",
    descriptionKey: "helpContacts",
    run: ({ log, t }) => log(linkify(t({ key: "contacts" }))),
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
    name: "settings",
    aliases: ["cd settings"],
    descriptionKey: "helpSettings",
    shareable: false,
    run: ({ navigate }) => navigate(ROUTES.SETTINGS),
  },
];
