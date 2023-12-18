import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage";
import ConsolePage from "../pages/ConsolePage";
import { ROUTES } from "./const";
import { reducer } from "../store/app/reducer";
import { setStatus } from "../store/app/actions";
import localization from "../localization";
import { AppContext } from "../context/appContext";
import storage from "../storage";

const consolePageParams = {
  element: <ConsolePage />,
  errorElement: <ErrorPage />,
};

const router = createBrowserRouter([
  {
    ...consolePageParams,
    path: ROUTES.MAIN,
  },
  {
    ...consolePageParams,
    path: ROUTES.EDUCATION,
  },
  {
    ...consolePageParams,
    path: ROUTES.SETTINGS,
  },
]);

export const Router: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    status: "init",
    theme: "Black",
    language: storage.getLanguage(),
  });

  React.useEffect(() => {
    (async () => {
      dispatch(setStatus("loading"));
      await localization.initDictionary();
      dispatch(setStatus("ok"));
    })();
  }, []);

  return (
    <AppContext.Provider value={{ appDispatch: dispatch, appState: state }}>
      <RouterProvider router={router} />
    </AppContext.Provider>
  );
};
