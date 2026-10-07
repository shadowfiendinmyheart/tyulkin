import { ROUTES } from "../../router/const";
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
    name: "settings",
    aliases: ["cd settings"],
    descriptionKey: "helpSettings",
    run: ({ navigate }) => navigate(ROUTES.SETTINGS),
  },
];
