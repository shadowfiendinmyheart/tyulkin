import React from "react";
import { CaretMode } from "../../../domain";

// restarts the blink of every char in the container on one start time; paused animations
// (reduced motion: the caret stays steady on its first keyframe) are left as they are
export const syncCaretBlink = (container: Element) => {
  // jsdom has no Web Animations API
  if (typeof container.getAnimations !== "function") return;
  const now = document.timeline.currentTime;
  if (now === null) return;
  for (const animation of container.getAnimations({ subtree: true })) {
    if (animation.playState === "running") animation.startTime = now;
  }
};

// the block caret (::after of a char) and the inverted char under it (`.block + .char`) are two CSS
// animations, and a CSS animation starts only when its element starts to match: the first char of
// the autosuggestion (TASK-87) stays the same element while the caret moves over the typed chars,
// so it kept its old phase and blinked out of step with the caret (TASK-100). Every change of the
// caret, edit of the line or change of the suggestion restarts them together, the caret shown at once
export const useCaretBlinkSync = (
  containerRef: React.RefObject<Element | null>,
  caretMode: CaretMode,
  caretPosition: number,
  line: string,
  autosuggestion: string | undefined,
) => {
  React.useLayoutEffect(() => {
    if (containerRef.current) syncCaretBlink(containerRef.current);
  }, [containerRef, caretMode, caretPosition, line, autosuggestion]);
};
