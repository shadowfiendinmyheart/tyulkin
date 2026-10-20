import { TFunction } from "../localization/interfaces";
import { LogNode } from "../store/console/interfaces";
import { linkify, withNode } from "../store/console/logNodes";

// what `qr` encodes: the address of the site, or the contacts as a vCard (TASK-96)
export const QR_VCARD_PARAM = "--vcard";

// light modules around the code: the quiet zone of the spec, the page around it may be dark
const QR_BORDER = 4;

// the root of the site, with the base path: "https://…/tyulkin/"
export const getSiteUrl = () => new URL(__BASE_PATH__, window.location.href).href;

// text values of a vCard escape "\", "," and ";" (RFC 6350, 3.4)
const escapeVcardText = (value: string) => value.replace(/[\\,;]/g, (char) => `\\${char}`);

// a vCard of the owner from the dictionaries, nothing else: the name is the first line of `about`,
// the phone, the email and the links are the ones `contacts` shows
export const getVcard = (t: TFunction) => {
  const fullName = t({ key: "about" }).split("\n")[0].trim();
  const nameParts = fullName.split(/\s+/);
  const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const givenNames = nameParts.slice(0, familyName ? -1 : undefined).join(" ");

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcardText(familyName)};${escapeVcardText(givenNames)};;;`,
    `FN:${escapeVcardText(fullName)}`,
  ];
  for (const node of linkify(t({ key: "contacts" }))) {
    if (typeof node === "string" || node.type !== "link") continue;
    if (node.href.startsWith("tel:")) lines.push(`TEL;TYPE=CELL:${node.href.slice(4)}`);
    else if (node.href.startsWith("mailto:")) lines.push(`EMAIL:${node.href.slice(7)}`);
    // percent-encoded: contact apps may not take a non-ASCII URI (the LinkedIn one)
    else lines.push(`URL:${new URL(node.href).href}`);
  }
  lines.push("END:VCARD");
  // vCard lines end with CRLF
  return lines.join("\r\n");
};

// half blocks: a character is two modules, the upper and the lower one; dark modules are drawn
const HALF_BLOCKS = [" ", "▄", "▀", "█"];

// the modules of a QR code (true is dark) as text, two rows per line
export const drawQr = (modules: boolean[][]) => {
  const lines: string[] = [];
  for (let row = 0; row < modules.length; row += 2) {
    const upper = modules[row];
    const lower = modules[row + 1];
    lines.push(
      upper.map((dark, column) => HALF_BLOCKS[(dark ? 2 : 0) + (lower?.[column] ? 1 : 0)]).join(""),
    );
  }
  return lines.join("\n");
};

// a code still loading is not shown after `clear`: only if no clear came while it loaded
let clearsCount = 0;
export const stopQr = () => {
  clearsCount += 1;
};

// the code is an image to scan: screen readers skip it, the line over it says what it holds
const getQrNode = (modules: boolean[][]): LogNode => ({
  type: "pre",
  text: drawQr(modules),
  qr: true,
  decorative: true,
});

interface QrParams {
  t: TFunction;
  param: string | undefined;
  log: (content: LogNode | LogNode[]) => void;
  fail: () => void;
}

// `qr`: the code of the site address, `qr --vcard`: of the contacts; the generator is a chunk
// of its own, loaded on the first use
export const showQr = async ({ t, param, log, fail }: QrParams) => {
  const isVcard = param?.toLowerCase() === QR_VCARD_PARAM;
  if (param !== undefined && !isVcard) {
    log(
      withNode((vcard) => t({ key: "qrUsage", args: { vcard } }), {
        type: "command",
        command: `qr ${QR_VCARD_PARAM}`,
      }),
    );
    fail();
    return;
  }

  const clearsAtStart = clearsCount;
  let encode: typeof import("uqr").encode;
  try {
    ({ encode } = await import(/* webpackChunkName: "qr" */ "uqr"));
  } catch {
    if (clearsCount !== clearsAtStart) return;
    log({ type: "text", text: t({ key: "qrLoadFailed" }), color: "error" });
    fail();
    return;
  }
  if (clearsCount !== clearsAtStart) return;

  if (isVcard) {
    log(t({ key: "qrVcard" }));
    log(getQrNode(encode(getVcard(t), { border: QR_BORDER }).data));
  } else {
    const siteUrl = getSiteUrl();
    log([t({ key: "qrSite" }), " ", ...linkify(siteUrl)]);
    log(getQrNode(encode(siteUrl, { border: QR_BORDER }).data));
  }
};
