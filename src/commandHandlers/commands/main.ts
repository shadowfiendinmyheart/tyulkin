import { ROUTES } from "../../router/const";
import { GuiLocationState } from "../../router/interfaces";
import { linkify, withNodes } from "../../store/console/logNodes";
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
    name: "settings",
    aliases: ["cd settings"],
    descriptionKey: "helpSettings",
    run: ({ navigate }) => navigate(ROUTES.SETTINGS),
  },
];
