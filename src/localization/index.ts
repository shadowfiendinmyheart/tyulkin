import { getLocaleWithArgs } from "./utils";
import { Dictionary, Languages, LocaleParams, TFunction } from "./interfaces";

export const loadDictionary = async (language: Languages): Promise<Dictionary> => {
  // keys like "404command" are not valid identifiers, so only `default` is guaranteed to have them
  const jsonDictionary = await import(`./dictionaries/${language}.json`);
  const dictionary: Dictionary | undefined = jsonDictionary.default;
  if (!dictionary) throw Error(`dictionary ${language} is empty`);
  return dictionary;
};

export const createT =
  (dictionary: Dictionary): TFunction =>
  (params: LocaleParams) => {
    const locale = dictionary[params.key];
    if ("args" in params) {
      return getLocaleWithArgs({ ...params, locale });
    }
    return locale;
  };
