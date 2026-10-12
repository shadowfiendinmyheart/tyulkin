import { ROUTES } from "../../router/const";
import { linkify } from "../../store/console/logNodes";
import { Command } from "../interfaces";

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
    run: ({ log, t }) => log(linkify(t({ key: "projects" }))),
  },
  {
    name: "contacts",
    descriptionKey: "helpContacts",
    run: ({ log, t }) => log(linkify(t({ key: "contacts" }))),
  },
  {
    name: "settings",
    aliases: ["cd settings"],
    descriptionKey: "helpSettings",
    run: ({ navigate }) => navigate(ROUTES.SETTINGS),
  },
];
