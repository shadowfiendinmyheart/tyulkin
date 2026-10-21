import { describe, expect, it, vi } from "vitest";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import ru from "../localization/dictionaries/ru.json";
import { LogContent } from "../store/console/interfaces";
import { stopLazyCommands } from "./lazy";
import { drawQr, getSiteUrl, getVcard, showQr } from "./qr";

describe("drawQr (TASK-96)", () => {
  it("draws two rows of modules per line with half blocks", () => {
    expect(
      drawQr([
        [true, true, false, false],
        [true, false, true, false],
      ]),
    ).toBe("█▀▄ ");
  });

  it("takes the missing lower row of an odd height as light", () => {
    expect(drawQr([[true, false]])).toBe("▀ ");
  });
});

describe("getVcard (TASK-96)", () => {
  it("is made of the name and the contacts from the dictionary", () => {
    const lines = getVcard(createT(eng)).split("\r\n");
    expect(lines).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Tyulkin;Ivan;;;",
      "FN:Ivan Tyulkin",
      "URL:https://t.me/thedawnisyourenemy",
      "EMAIL:tyulkindev@yandex.ru",
      "TEL;TYPE=CELL:+79508211819",
      // percent-encoded: contact apps may not take a non-ASCII URI
      "URL:https://www.linkedin.com/in/%D0%B8%D0%B2%D0%B0%D0%BD-%D1%82%D1%8E%D0%BB%D1%8C%D0%BA%D0%B8%D0%BD-273121270/",
      "URL:https://github.com/shadowfiendinmyheart",
      "END:VCARD",
    ]);
  });

  it("takes the name in the current language", () => {
    expect(getVcard(createT(ru))).toContain("N:Тюлькин;Иван;;;\r\nFN:Иван Тюлькин\r\n");
  });
});

describe("showQr (TASK-96)", () => {
  const run = async (param?: string) => {
    const logs: LogContent[] = [];
    const fail = vi.fn();
    await showQr({ t: createT(eng), param, log: (content) => logs.push(content), fail });
    return { logs, fail };
  };

  it("shows the site address with its code", async () => {
    const { logs, fail } = await run();
    expect(logs[0]).toEqual([
      "Scan to open",
      " ",
      { type: "link", text: getSiteUrl(), href: getSiteUrl() },
    ]);
    const qr = logs[1] as { type: "pre"; text: string; qr: boolean };
    expect(qr).toMatchObject({ type: "pre", qr: true, decorative: true });
    const lines = qr.text.split("\n");
    // square: the width is the size of the code with its border, the height half of it
    expect(lines.every((line) => line.length === lines[0].length)).toBe(true);
    expect(lines).toHaveLength(Math.ceil(lines[0].length / 2));
    // the quiet zone is light
    expect(lines[0]).toMatch(/^ +$/);
    expect(fail).not.toHaveBeenCalled();
  });

  it("shows the contacts as a vCard with --vcard, in any case", async () => {
    const { logs, fail } = await run("--VCARD");
    expect(logs[0]).toBe("Scan to save my contact");
    expect(logs[1]).toMatchObject({ type: "pre", qr: true });
    // more data than the address: a bigger code
    const { logs: siteLogs } = await run();
    const width = (content: LogContent) => (content as { text: string }).text.indexOf("\n");
    expect(width(logs[1])).toBeGreaterThan(width(siteLogs[1]));
    expect(fail).not.toHaveBeenCalled();
  });

  it("explains the usage and fails on an unknown argument", async () => {
    const { logs, fail } = await run("--png");
    expect(logs).toEqual([
      [
        "Type qr for the site address or ",
        { type: "command", command: "qr --vcard" },
        " for my contacts",
      ],
    ]);
    expect(fail).toHaveBeenCalled();
  });

  it("shows nothing when the console is cleared while the generator loads", async () => {
    const logs: LogContent[] = [];
    const shown = showQr({
      t: createT(eng),
      param: undefined,
      log: (c) => logs.push(c),
      fail: vi.fn(),
    });
    stopLazyCommands();
    await shown;
    expect(logs).toEqual([]);
  });
});
