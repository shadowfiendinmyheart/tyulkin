import React from "react";
import localization from "./localization";
import { Router } from "./router";

import storage from "./storage";

const App: React.FC = () => {
  React.useEffect(() => {
    // console.log("init");
    // TODO: why doesn't work??
    // return () => {
    //   console.log('destroy', localization.language);
    //   if (localization.language) {
    //     storage.setLocalization(localization.language);
    //   }
    // }
  }, []);

  return <Router />;
};

export default App;
