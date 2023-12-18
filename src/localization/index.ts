import { Dictionary, DictionaryKeys, Languages } from "./interfaces";
import storage from "../storage";

class Localization {
  private dictionary: Dictionary | undefined;
  private language: Languages = storage.getLanguage();

  private async getDictionary(): Promise<Dictionary | undefined> {
    const jsonDictionary = await import(`./dictionaries/${this.language}.json`);
    return jsonDictionary?.default;
  }

  async initDictionary() {
    const dictionary = await this.getDictionary();
    if (!dictionary) throw Error("init dictionary error");
    this.dictionary = dictionary;
  }

  async changeDictionary(language: Languages) {
    this.language = language;
    await this.initDictionary();
  }

  // TODO: make typed params
  getLocale(key: DictionaryKeys, params?: any) {
    if (!this.dictionary) throw Error("dictionary is empty");
    const locale = this.dictionary[key];
    // TODO: make params
    return locale;
  }
}

export default new Localization();
