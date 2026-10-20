import { CommonDictionaryKeys, TFunction } from "../localization/interfaces";
import { LogNode } from "../store/console/interfaces";
import { joinNodes } from "../store/console/logNodes";
import { Command, CommandBase } from "./interfaces";
import { separateCommand } from "./utils";

// `<command> --help` shows the manual of the command, as `man <command>` (TASK-89)
export const HELP_FLAG = "--help";

const INDENT = "    ";

// "ls projects --help" -> "ls projects"; undefined when the line doesn't end with the flag
// or is the flag alone
const stripHelpFlag = (line: string) => {
  const words = line.trim().split(/\s+/);
  if (words.length < 2 || words[words.length - 1].toLowerCase() !== HELP_FLAG) return;
  return words.slice(0, -1).join(" ");
};

// the command whose manual the line asks for with a trailing --help, as the handler and the
// highlighting resolve it; a command with any arguments takes a later --help as its text
// (`ask how to use --help`), so only `ask --help` is its manual
export const findHelpTarget = <T extends CommandBase>(commands: T[], line: string) => {
  const helpOf = stripHelpFlag(line);
  const separated = helpOf === undefined ? undefined : separateCommand(commands, helpOf);
  if (!separated || (separated.command.anyArgs && separated.params.length)) return;
  return separated;
};

// "ls [argument]", "echo [argument...]", "clear": every argument is optional
const getSynopsis = (command: Command, t: TFunction) => {
  const argument = t({ key: "manArgument" });
  if (command.anyArgs) return `${command.name} [${argument}...]`;
  if (command.params) return `${command.name} [${argument}]`;
  return command.name;
};

// a man-like page of a command from the registry: NAME, SYNOPSIS, DESCRIPTION, and ALIASES and
// PARAMS when it has them; names, aliases and params are commands, a click runs them
export const getManPage = (command: Command, t: TFunction): LogNode[] => {
  const sections: [CommonDictionaryKeys, LogNode[]][] = [
    ["manName", [{ type: "command", command: command.name }]],
    ["manSynopsis", [getSynopsis(command, t)]],
    ["manDescription", [t({ key: command.descriptionKey })]],
  ];
  if (command.aliases?.length) {
    const aliases = command.aliases.map((alias): LogNode => ({ type: "command", command: alias }));
    sections.push(["manAliases", joinNodes(aliases, ", ")]);
  }
  if (command.params?.length) {
    const params = command.params.map((param): LogNode => ({
      type: "command",
      command: `${command.name} ${param}`,
      label: param,
    }));
    sections.push(["manParams", joinNodes(params, ", ")]);
  }
  return sections.flatMap(([header, content], index): LogNode[] => [
    ...(index ? ["\n\n"] : []),
    { type: "text", text: t({ key: header }), color: "accent" },
    `\n${INDENT}`,
    ...content,
  ]);
};
