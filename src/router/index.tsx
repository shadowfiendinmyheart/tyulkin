import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";

const router = createBrowserRouter(routes);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
