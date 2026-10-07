import storage from "../storage";
import { getLocaleWithArgs } from "./utils";
import { Dictionary, Languages, LocaleParams } from "./interfaces";

class Localization {
  private dictionary: Dictionary | undefined;
  private language: Languages = storage.getLanguage();

  private async getDictionary(language: Languages): Promise<Dictionary | undefined> {
    // keys like "404command" are not valid identifiers, so only `default` is guaranteed to have them
    const jsonDictionary = await import(`./dictionaries/${language}.json`);
    return jsonDictionary.default;
  }

  async initDictionary() {
    const dictionary = await this.getDictionary(this.language);
    if (!dictionary) throw Error("init dictionary error");
    this.dictionary = dictionary;
  }

  async changeDictionary(language: Languages) {
    const dictionary = await this.getDictionary(language);
    if (!dictionary) throw Error("change dictionary error");
    // switch only after a successful load, so a failed import keeps the current language
    this.language = language;
    this.dictionary = dictionary;
  }

  getLocale(params: LocaleParams) {
    if (!this.dictionary) throw Error("dictionary is empty");
    const locale = this.dictionary[params.key];
    if ("args" in params) {
      return getLocaleWithArgs({ ...params, locale });
    }
    return locale;
  }
}

export default new Localization();
