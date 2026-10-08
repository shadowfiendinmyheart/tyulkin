import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// self-hosted font: all subsets with unicode-range, the browser fetches only the ones in use (Latin is
// preloaded, see webpack.config.js); per-subset fontsource files lack unicode-range, so they are not used
import "@fontsource/ibm-plex-mono/400";
import "./main.scss";

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
