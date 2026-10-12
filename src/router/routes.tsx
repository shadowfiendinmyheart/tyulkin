import { RouteObject } from "react-router";
import ErrorPage from "../pages/ErrorPage";
import ConsolePage from "../pages/ConsolePage";
import GuiPage from "../pages/GuiPage";
import { CONSOLE_ROUTES, ROUTES } from "./const";
import { ConsoleSessionLayout } from "./ConsoleSessionLayout";

export const routes: RouteObject[] = [
  {
    // pathless: the pages keep their absolute paths
    element: <ConsoleSessionLayout />,
    errorElement: <ErrorPage />,
    children: [
      ...Object.values(CONSOLE_ROUTES).map((route) => ({
        path: route,
        // the page gets its route from here, not from the raw pathname ("/settings/", "/Settings")
        element: <ConsolePage route={route} />,
        errorElement: <ErrorPage />,
      })),
      {
        path: ROUTES.GUI,
        element: <GuiPage />,
        errorElement: <ErrorPage />,
      },
    ],
  },
];
