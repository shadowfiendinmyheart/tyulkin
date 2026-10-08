import React from "react";
import { Router } from "./router";
import { reducer } from "./store/app/reducer";
import { setStatus } from "./store/app/actions";
import { createT, loadDictionary } from "./localization";
import { Languages, TFunction } from "./localization/interfaces";
import { htmlLangByLanguage } from "./localization/utils";
import { AppContext } from "./context/appContext";
import { LocalizationContext, LocalizationContextType } from "./context/localizationContext";
import storage from "./storage";
import LoadingPage from "./pages/LoadingPage";
import { ErrorScreen } from "./pages/ErrorPage";
import { delay } from "./utils";

// loading animation is shown at least this long, so it doesn't just flash
const MIN_LOADING_ANIMATION_MS = 1000;

const getLoadingAnimationTime = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return prefersReducedMotion ? 0 : MIN_LOADING_ANIMATION_MS;
};

// language and its translations change together, so they live in one state
interface LocalizationState {
  language: Languages;
  t: TFunction;
}

const App: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    status: "init",
    theme: storage.getThemeMode(),
  });
  const [initialLanguage] = React.useState(storage.getLanguage);
  const [localization, setLocalization] = React.useState<LocalizationState | null>(null);
  // language switches run one after another, so the last requested language wins
  const languageQueue = React.useRef<Promise<unknown>>(Promise.resolve());

  React.useLayoutEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  // known before the dictionary loads, so <html lang> is right during loading and on error too
  const language = localization?.language ?? initialLanguage;
  React.useLayoutEffect(() => {
    document.documentElement.lang = htmlLangByLanguage[language];
  }, [language]);

  React.useEffect(() => {
    (async () => {
      try {
        dispatch(setStatus("loading"));
        // dictionary loads in parallel with the animation instead of after it
        const [dictionary] = await Promise.all([
          loadDictionary(initialLanguage),
          delay(getLoadingAnimationTime()),
        ]);
        setLocalization({ language: initialLanguage, t: createT(dictionary) });
        dispatch(setStatus("ok"));
      } catch (error) {
        dispatch(setStatus("error"));
      }
    })();
  }, [initialLanguage]);

  const changeLanguage = React.useCallback((language: Languages) => {
    const switched = languageQueue.current
      .catch(() => undefined)
      .then(async () => {
        // switch only after a successful load, so a failed import keeps the current language
        const t = createT(await loadDictionary(language));
        storage.setLanguage(language);
        setLocalization({ language, t });
        return t;
      });
    languageQueue.current = switched;
    return switched;
  }, []);

  const localizationValue = React.useMemo<LocalizationContextType | null>(
    () => localization && { ...localization, changeLanguage },
    [localization, changeLanguage],
  );

  if (["init", "loading"].includes(state.status)) return <LoadingPage />;
  // no dictionary means no texts for the pages, so the router is not rendered at all;
  // the message is not translated for the same reason
  if (state.status === "error") {
    return (
      <ErrorScreen status="500" message="failed to load the dictionary, try reloading the page" />
    );
  }

  return (
    <AppContext.Provider value={{ appDispatch: dispatch, appState: state }}>
      <LocalizationContext.Provider value={localizationValue}>
        <Router />
      </LocalizationContext.Provider>
    </AppContext.Provider>
  );
};

export default App;
