import React from "react";
import { Languages, TFunction } from "../localization/interfaces";

export interface LocalizationContextType {
  language: Languages;
  t: TFunction;
  // loads the dictionary, then switches and saves the language; resolves with `t` of the new language
  changeLanguage: (language: Languages) => Promise<TFunction>;
}

export const LocalizationContext = React.createContext<LocalizationContextType | null>(null);

export const useLocalization = () => {
  const localizationContext = React.useContext(LocalizationContext);

  if (!localizationContext) {
    // App renders the provider only with a loaded dictionary
    throw new Error("<LocalizationContext.Provider> is missing");
  }

  return localizationContext;
};

export const useT = () => useLocalization().t;
