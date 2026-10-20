import { linkify, withNode, withNodes } from "../../store/console/logNodes";
import { COFFEE_CUP, getCowsay, getFortune, LOCOMOTIVE, VIM_SCREEN } from "../easterEggs";
import { SecretCommand } from "../interfaces";

// easter eggs (TASK-63): checked after the commands of the page, so they never shadow them;
// a longer phrase goes before its prefix ("sudo hire-me" before "sudo")
export const secretCommands: SecretCommand[] = [
  {
    name: "sudo hire-me",
    aliases: ["sudo hire me"],
    // "sudo hire-me please" too, not the sudoers answer
    anyArgs: true,
    secret: "hireMe",
    run: ({ log, t }) => {
      log(t({ key: "sudoHireMe" }));
      log(linkify(t({ key: "contacts" })));
    },
  },
  {
    // `sudo` with anything else, `sudo rm -rf /` included
    name: "sudo",
    secret: "sudo",
    anyArgs: true,
    run: ({ log, t, fail }) => {
      log({ type: "text", text: t({ key: "sudo" }), color: "error" });
      fail();
    },
  },
  {
    name: "rm -rf /",
    aliases: ["rm -rf /*", "rm -fr /"],
    // "rm -rf / --no-preserve-root" too
    anyArgs: true,
    secret: "rmRf",
    run: ({ log, t }) => {
      log({ type: "text", text: t({ key: "rmRf" }), color: "muted" });
      log({ type: "text", text: t({ key: "rmRfJoke" }), color: "accent" });
    },
  },
  {
    name: "vim",
    aliases: ["vi", "nvim"],
    secret: "vim",
    run: ({ log, t }) => {
      log({ type: "pre", text: VIM_SCREEN, decorative: true });
      log(
        withNodes(
          ([quit, forceQuit]) => t({ key: "vim", args: { quit, forceQuit } }),
          [
            { type: "command", command: ":q" },
            { type: "command", command: ":q!" },
          ],
        ),
      );
    },
  },
  {
    name: ":q",
    aliases: [":q!", ":wq", ":x", ":qa", ":qa!"],
    secret: "vimExit",
    run: ({ log, t }) => log(t({ key: "vimExit" })),
  },
  {
    // the text is the visitor's: plain text in the bubble
    name: "cowsay",
    secret: "cowsay",
    anyArgs: true,
    run: ({ log, t }, args) =>
      log({ type: "pre", text: getCowsay(args.join(" ") || t({ key: "cowsayDefault" })) }),
  },
  {
    name: "fortune",
    secret: "fortune",
    run: ({ log, t }) => log(getFortune(t({ key: "fortunes" }))),
  },
  {
    name: "sl",
    secret: "sl",
    run: ({ log, t }) => {
      log({ type: "pre", text: LOCOMOTIVE, decorative: true });
      log(withNode((ls) => t({ key: "sl", args: { ls } }), { type: "command", command: "ls" }));
    },
  },
  {
    name: "coffee",
    aliases: ["make coffee", "brew coffee"],
    secret: "coffee",
    run: ({ log, t }) => {
      log({ type: "pre", text: COFFEE_CUP, decorative: true });
      log(t({ key: "coffee" }));
    },
  },
];
