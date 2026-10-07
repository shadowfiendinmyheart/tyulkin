import React from "react";
import { Router } from "./router";
import { reducer } from "./store/app/reducer";
import { setStatus } from "./store/app/actions";
import localization from "./localization";
import { AppContext } from "./context/appContext";
import storage from "./storage";
import LoadingPage from "./pages/LoadingPage";
import { delay } from "./utils";

// loading animation is shown at least this long, so it doesn't just flash
const MIN_LOADING_ANIMATION_MS = 1000;

const getLoadingAnimationTime = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return prefersReducedMotion ? 0 : MIN_LOADING_ANIMATION_MS;
};

const App: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    status: "init",
    theme: storage.getThemeMode(),
    language: storage.getLanguage(),
  });

  React.useLayoutEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  React.useEffect(() => {
    (async () => {
      try {
        dispatch(setStatus("loading"));
        // dictionary loads in parallel with the animation instead of after it
        await Promise.all([localization.initDictionary(), delay(getLoadingAnimationTime())]);
        dispatch(setStatus("ok"));
      } catch (error) {
        dispatch(setStatus("error"));
      }
    })();
  }, []);

  if (["init", "loading"].includes(state.status)) return <LoadingPage />;

  return (
    <AppContext.Provider value={{ appDispatch: dispatch, appState: state }}>
      <Router />
    </AppContext.Provider>
  );
};

export default App;
