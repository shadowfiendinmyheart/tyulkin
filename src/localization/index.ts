import storage from "../storage";
import { getLocaleWithArgs } from "./utils";
import { Dictionary, Languages, LocaleParams } from "./interfaces";

class Localization {
  private dictionary: Dictionary | undefined;
  private language: Languages = storage.getLanguage();

  private async getDictionary(language: Languages): Promise<Dictionary | undefined> {
    const jsonDictionary = await import(`./dictionaries/${language}.json`);
    return jsonDictionary;
  }

  async initDictionary() {
    const dictionary = await this.getDictionary(this.language);
    if (!dictionary) throw Error("init dictionary error");
    this.dictionary = dictionary;
  }

  async changeDictionary(language: Languages) {
    this.language = language;
    await this.initDictionary();
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
