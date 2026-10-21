import { RouteObject } from "react-router";
import ErrorPage from "../pages/ErrorPage";
import ConsolePage from "../pages/ConsolePage";
import LoadingPage from "../pages/LoadingPage";
import { CONSOLE_ROUTES, ROUTES } from "./const";
import { ConsoleSessionLayout } from "./ConsoleSessionLayout";

export const routes: RouteObject[] = [
  {
    // pathless: the pages keep their absolute paths
    element: <ConsoleSessionLayout />,
    errorElement: <ErrorPage />,
    // a direct visit to /gui: the router starts once the lazy page is loaded (TASK-105)
    hydrateFallbackElement: <LoadingPage />,
    children: [
      ...Object.values(CONSOLE_ROUTES).map((route) => ({
        path: route,
        // the page gets its route from here, not from the raw pathname ("/settings/", "/Settings")
        element: <ConsolePage route={route} />,
        errorElement: <ErrorPage />,
      })),
      {
        path: ROUTES.GUI,
        // a chunk of its own (TASK-105): the first screen is the terminal. Prefetched once the
        // page is loaded, so `gui` and the switch in the toolbar don't wait for the network
        lazy: async () => {
          const { default: Component } = await import(
            /* webpackChunkName: "gui", webpackPrefetch: true */ "../pages/GuiPage"
          );
          return { Component };
        },
        errorElement: <ErrorPage />,
      },
    ],
  },
];
