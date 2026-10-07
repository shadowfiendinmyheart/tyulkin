import { describe, expect, it } from "vitest";
import { GlobalCommands } from "../../commandHandlers/WithGlobalHandler";
import { MainCommands } from "../../commandHandlers/WithMainHandler";
import { SettingsCommands } from "../../commandHandlers/WithSettingsHandler";
import { getHelpLocaleArgs } from "../../commandHandlers/utils";
import { getLocaleWithArgs, LOCALE_PARAMS_ANCHOR } from "../utils";
import eng from "./eng.json";
import ru from "./ru.json";

const dictionaries = { eng, ru };

const helpCommands = {
  help: GlobalCommands,
  "/Help": MainCommands,
  "/settingsHelp": SettingsCommands,
} as const;

describe.each(Object.entries(dictionaries))("%s dictionary", (_, dictionary) => {
  it("has the same keys as the other dictionaries", () => {
    Object.values(dictionaries).forEach((other) => {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(other).sort());
    });
  });

  it.each(Object.entries(helpCommands))("%s lists every command", (key, commands) => {
    const locale = getLocaleWithArgs({
      key: key as keyof typeof helpCommands,
      args: getHelpLocaleArgs(commands),
      locale: dictionary[key as keyof typeof helpCommands],
    });

    expect(locale).not.toContain(LOCALE_PARAMS_ANCHOR);
    Object.values(commands).forEach((command) => {
      expect(locale.split("\n")).toContainEqual(
        expect.stringMatching(new RegExp(`^${command} - `)),
      );
    });
  });

  it("has no broken line breaks", () => {
    Object.values(dictionary).forEach((locale) => expect(locale).not.toContain("/n"));
  });
});
