import { CaretMode, ThemeMode } from "../domain";
import { Languages, TFunction } from "../localization/interfaces";
import { htmlLangByLanguage } from "../localization/utils";
import { LogColor, LogNode } from "../store/console/interfaces";
import logo from "./neofetchLogo.json";

// the logo: initials, as neofetch shows the distro logo; the og:image draws it too
// (scripts/og-image.cjs)
const LOGO = logo.join("\n");

// the first commercial job (July 2022, see `experience` in the dictionaries): "uptime" counts from it
const CAREER_START_YEAR = 2022;
const CAREER_START_MONTH = 6;

// theme colors of the palette strip, as the color blocks under neofetch
const PALETTE: LogColor[] = ["text", "muted", "accent", "error"];

// "4 years 3 months" / "4 года 3 месяца": whole months since the career start
export const getUptime = (now: Date, language: Languages) => {
  const totalMonths = Math.max(
    0,
    (now.getFullYear() - CAREER_START_YEAR) * 12 + now.getMonth() - CAREER_START_MONTH,
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const format = (value: number, unit: "year" | "month") =>
    new Intl.NumberFormat(htmlLangByLanguage[language], {
      style: "unit",
      unit,
      unitDisplay: "long",
    }).format(value);
  const parts = [];
  if (years) parts.push(format(years, "year"));
  if (months || !years) parts.push(format(months, "month"));
  return parts.join(" ");
};

interface NeofetchParams {
  t: TFunction;
  language: Languages;
  theme: ThemeMode;
  caretMode: CaretMode;
  now: Date;
}

// the logo on the left, "key: value" lines on the right: the welcome of the main page
// and the `neofetch` command
export const getNeofetch = ({ t, language, theme, caretMode, now }: NeofetchParams): LogNode[] => {
  const [title, ...fields] = t({
    key: "neofetch",
    args: { uptime: getUptime(now, language), theme, caret: caretMode, language },
  }).split("\n");

  const info: LogNode[] = [
    { type: "text", text: title, color: "accent" },
    "\n",
    "-".repeat(title.length),
  ];
  for (const field of fields) {
    info.push("\n");
    const separator = field.indexOf(": ");
    if (separator === -1) {
      info.push(field);
      continue;
    }
    info.push(
      { type: "text", text: field.slice(0, separator + 1), color: "accent" },
      field.slice(separator + 1),
    );
  }
  info.push(
    "\n\n",
    ...PALETTE.map((color): LogNode => ({ type: "text", text: "███", color, decorative: true })),
  );

  return [{ type: "table", rows: [[[{ type: "pre", text: LOGO, decorative: true }], info]] }];
};
