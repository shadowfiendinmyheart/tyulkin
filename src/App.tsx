import React from "react";
import { Router } from "./router";
import { reducer } from "./store/app/reducer";
import { setStatus } from "./store/app/actions";
import localization from "./localization";
import { AppContext } from "./context/appContext";
import storage from "./storage";
import LoadingPage from "./pages/LoadingPage";

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
        await new Promise((res) => setTimeout(res, 1000));
        await localization.initDictionary();
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
