import { Languages, languages, LocaleWithArgs } from "./interfaces";

export const checkLanguage = (x: string) => languages.find((language) => language === x);

// value of <html lang>: BCP 47 tag of the language
export const htmlLangByLanguage: Record<Languages, string> = {
  ru: "ru",
  eng: "en",
};

type GetLocaleWithArgsParams = LocaleWithArgs & { locale: string };
// "$name" -> args.name, every occurrence in one pass, so "$" inside values is kept as is;
// longer names go first, so "$themes" is not taken for "$theme" + "s"
export const getLocaleWithArgs = ({ locale, args }: GetLocaleWithArgsParams) => {
  const argsByName: Record<string, string> = args;
  const names = Object.keys(argsByName).sort((a, b) => b.length - a.length);
  if (!names.length) return locale;
  return locale.replace(
    new RegExp(`\\$(${names.join("|")})`, "g"),
    (_, name: string) => argsByName[name],
  );
};
