import React from "react";
import { getSetTheme } from "../../../commandHandlers/commands/settings";
import { useAppContext } from "../../../context/appContext";
import { setPreviewTheme } from "../../../store/app/actions";

// live preview (TASK-84): while an option of `set theme` is selected in the completion menu (or
// accepted from it and not yet run) the page shows its theme; Esc or an edit puts the set one back
export const useThemePreview = (shownOption: string | undefined) => {
  const { appDispatch } = useAppContext();
  const theme = shownOption === undefined ? undefined : getSetTheme(shownOption);

  React.useEffect(() => {
    if (!theme) return;
    appDispatch(setPreviewTheme(theme));
    return () => appDispatch(setPreviewTheme(null));
  }, [theme, appDispatch]);
};
