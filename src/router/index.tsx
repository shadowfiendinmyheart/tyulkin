import React from "react";
// RouterProvider from "react-router", not "react-router/dom": the latter only adds flushSync (unused)
// and under vitest loads a second (CJS) copy of react-router, which breaks the router context
import { createBrowserRouter, RouterProvider } from "react-router";
import { routes } from "./routes";

const router = createBrowserRouter(routes);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
