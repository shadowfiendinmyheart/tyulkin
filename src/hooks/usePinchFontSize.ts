import React from "react";
import { useConsoleContext } from "../context/consoleContext";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "../domain";
import storage from "../storage";
import { setFontSize } from "../store/console/actions";

const getDistance = (touches: React.TouchList) =>
  Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

const clampFontSize = (size: number) =>
  Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));

// a pinch over the console sets the font size as `set fontsize` does (TASK-94): live while the
// fingers move, kept in storage once they are lifted. The console doesn't zoom by a pinch itself
// (touch-action in ConsolePage styles): the text grows and rewraps instead of the page
export const usePinchFontSize = () => {
  const { consoleState, consoleDispatch } = useConsoleContext();
  const fontSizeRef = React.useRef(consoleState.fontSize);
  React.useLayoutEffect(() => {
    fontSizeRef.current = consoleState.fontSize;
  }, [consoleState.fontSize]);
  // the distance between the fingers and the font size when the pinch began, the size set by it
  const pinch = React.useRef<{ distance: number; fontSize: number; size: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const distance = getDistance(e.touches);
    if (distance === 0) return;
    const fontSize = fontSizeRef.current;
    pinch.current = { distance, fontSize, size: fontSize };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const current = pinch.current;
    if (!current || e.touches.length !== 2) return;
    const size = clampFontSize((current.fontSize * getDistance(e.touches)) / current.distance);
    if (size === current.size) return;
    current.size = size;
    consoleDispatch(setFontSize(size));
  };

  // a finger lifted (or the touch taken by the browser) ends the pinch
  const onTouchEnd = (e: React.TouchEvent) => {
    const current = pinch.current;
    if (!current || e.touches.length === 2) return;
    pinch.current = null;
    if (current.size !== current.fontSize) storage.setFontSize(current.size);
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd };
};
