export interface Dictionary {
  welcome: string;
  settingsWelcome: string;
  education: string;
  about: string;
  help: string;
  ["404command"]: string;
}

export type DictionaryKeys = keyof Dictionary;

type LocaleParamsGenerator<
  K extends DictionaryKeys,
  P extends string | void = void,
> = P extends string
  ? {
      key: K;
      params: { [key in P]: string };
    }
  : {
      key: K;
    };

type NotFoundLocaleParam = LocaleParamsGenerator<"404command", "unknownCommand">;
type AboutLocaleParam = LocaleParamsGenerator<"about">;

const aboutLocalParam: AboutLocaleParam = { key: "about" };
const notFoundLocaleParam: NotFoundLocaleParam = {
  key: "404command",
  params: { unknownCommand: "key" },
};

export const languages = ["ru", "eng"] as const;
export type Languages = (typeof languages)[number];
