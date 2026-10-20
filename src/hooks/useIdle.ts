import React from "react";

// what counts as input: typing, moving the mouse, clicking or tapping, scrolling
const ACTIVITY_EVENTS = ["keydown", "input", "pointerdown", "pointermove", "wheel", "touchmove"];

// calls onIdle when the visitor has given no input for delayMs while the tab was visible, then
// waits as long again. Input starts the wait over, and so does the tab shown again after being
// hidden: a hidden tab is never idle. Nothing is waited for while disabled
export const useIdle = (onIdle: () => void, delayMs: number, enabled: boolean) => {
  const onIdleRef = React.useRef(onIdle);
  React.useLayoutEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  React.useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    // input only moves the timestamp (the mouse fires many events); the timer re-checks it
    let lastActivity = Date.now();
    const markActivity = () => {
      lastActivity = Date.now();
    };
    const check = () => {
      if (document.visibilityState === "hidden") markActivity();
      const idleMs = Date.now() - lastActivity;
      if (idleMs < delayMs) {
        timer = setTimeout(check, delayMs - idleMs);
        return;
      }
      markActivity();
      timer = setTimeout(check, delayMs);
      onIdleRef.current();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") markActivity();
    };
    timer = setTimeout(check, delayMs);
    const options = { capture: true, passive: true };
    ACTIVITY_EVENTS.forEach((type) => document.addEventListener(type, markActivity, options));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((type) => document.removeEventListener(type, markActivity, options));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [delayMs, enabled]);
};
