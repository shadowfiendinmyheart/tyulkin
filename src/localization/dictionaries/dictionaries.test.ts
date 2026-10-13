import { describe, expect, it } from "vitest";
import { commandsByRoute, globalCommands } from "../../commandHandlers/commands";
import { askCommand } from "../../commandHandlers/commands/main";
import eng from "./eng.json";
import ru from "./ru.json";

const dictionaries = { eng, ru };

// `ask` is listed only in a build with its proxy (TASK-71), but is described in every one
const allCommands = [...globalCommands, ...Object.values(commandsByRoute).flat(), askCommand];
// the file system commands are made for every page (TASK-60): a key is repeated by the copies
const descriptionKeys = [...new Set(allCommands.map(({ descriptionKey }) => descriptionKey))];

it("every command has its own description key", () => {
  for (const key of descriptionKeys) {
    const commands = allCommands.filter((command) => command.descriptionKey === key);
    expect(new Set(commands.map(({ name }) => name)).size, key).toBe(1);
  }
});

describe.each(Object.entries(dictionaries))("%s dictionary", (_, dictionary) => {
  it("has the same keys as the other dictionaries", () => {
    Object.values(dictionaries).forEach((other) => {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(other).sort());
    });
  });

  it.each(allCommands.map((command) => [command.name, command.descriptionKey]))(
    "describes the %s command",
    (_, descriptionKey) => {
      expect(dictionary[descriptionKey]).toEqual(expect.stringMatching(/\S/));
    },
  );

  it("has no descriptions of removed commands", () => {
    const helpKeys = Object.keys(dictionary).filter((key) => /^help[A-Z]/.test(key));
    expect(helpKeys.sort()).toEqual([...descriptionKeys].sort());
  });

  it("has no broken line breaks", () => {
    Object.values(dictionary).forEach((locale) => expect(locale).not.toContain("/n"));
  });
});
