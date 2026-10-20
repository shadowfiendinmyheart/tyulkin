import { ThemeMode } from "../domain";
import { prefersReducedMotion } from ".";

// the new theme spreads as a circle from the element marked so: the prompt symbol (TASK-84)
export const THEME_ORIGIN_ATTRIBUTE = "data-theme-origin";

const TRANSITION_MS = 500;

// on <html> during a theme transition: the circle replaces the default cross-fade (main.scss)
export const THEME_TRANSITION_CLASS = "theme-transition";

// the theme of a transition whose screen is not captured yet: <html> still has the old one
let pendingTheme: ThemeMode | null = null;
// theme transitions not finished yet: the class stays on <html> until the last one ends
let runningTransitions = 0;

// the center of the circle: the marked element, or the middle of the screen without it
const getOrigin = () => {
  const rect = document.querySelector(`[${THEME_ORIGIN_ATTRIBUTE}]`)?.getBoundingClientRect();
  if (!rect) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

// puts the theme on <html>; animated: by View Transitions, the new theme grows as a circle over
// the old one. Without the API, with reduced motion or on the first theme it is set at once
export const applyTheme = (theme: ThemeMode, animated: boolean) => {
  const root = document.documentElement;
  // a theme still waiting for its transition to start counts as shown: the latest call wins
  if ((pendingTheme ?? root.dataset.theme) === theme) return;

  if (
    !animated ||
    !root.dataset.theme ||
    typeof document.startViewTransition !== "function" ||
    prefersReducedMotion()
  ) {
    pendingTheme = null;
    root.dataset.theme = theme;
    return;
  }

  const { x, y } = getOrigin();
  // to the farthest corner of the screen
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  pendingTheme = theme;
  // the old and new screens are not cross-faded only in this transition (see main.scss)
  runningTransitions += 1;
  root.classList.add(THEME_TRANSITION_CLASS);
  const transition = document.startViewTransition(() => {
    // a later theme came before the screen was captured: it is set already or will be
    if (pendingTheme !== theme) return;
    pendingTheme = null;
    root.dataset.theme = theme;
  });
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: TRANSITION_MS,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    // skipped (another theme came first, the tab is hidden): the theme is set anyway
    .catch(() => undefined);
  transition.finished
    .finally(() => {
      runningTransitions -= 1;
      if (!runningTransitions) root.classList.remove(THEME_TRANSITION_CLASS);
    })
    .catch(() => undefined);
};
