import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage";
import ConsolePage from "../pages/ConsolePage";
import { ROUTES } from "./const";

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
  return <RouterProvider router={router} />;
};
