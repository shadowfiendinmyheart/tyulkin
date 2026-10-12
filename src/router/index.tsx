import React from "react";
// RouterProvider from "react-router", not "react-router/dom": the latter only adds flushSync (unused)
// and under vitest loads a second (CJS) copy of react-router, which breaks the router context
import { createBrowserRouter, RouterProvider } from "react-router";
import { routes } from "./routes";

// the site may be served from a subpath (GitHub Pages: /tyulkin/), see basePath in webpack.config.js
// without the trailing slash: with "/tyulkin/" the router would not match "/tyulkin"
const router = createBrowserRouter(routes, { basename: __BASE_PATH__.replace(/\/$/, "") || "/" });

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
