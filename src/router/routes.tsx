import { RouteObject } from "react-router";
import ErrorPage from "../pages/ErrorPage";
import ConsolePage from "../pages/ConsolePage";
import { ROUTES } from "./const";

export const routes: RouteObject[] = Object.values(ROUTES).map((route) => ({
  path: route,
  // the page gets its route from here, not from the raw pathname ("/settings/", "/Settings")
  element: <ConsolePage route={route} />,
  errorElement: <ErrorPage />,
}));
