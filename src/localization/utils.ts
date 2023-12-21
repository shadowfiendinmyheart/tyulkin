import { languages, LocaleWithArgs } from "./interfaces";

export const LOCALE_PARAMS_ANCHOR = "$";

export const checkLanguage = (x: any) => languages.find((language) => language === x);

type GetLocaleWithArgsParams = LocaleWithArgs & { locale: string };
export const getLocaleWithArgs = (params: GetLocaleWithArgsParams) => {
  let localeWithParams = params.locale;
  Object.entries(params.args).forEach(([key, value]) => {
    localeWithParams = localeWithParams.replace(`${LOCALE_PARAMS_ANCHOR}${key}`, value);
  });
  return localeWithParams;
};
