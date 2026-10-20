import React from "react";

// how far a finger has to go, and how much more along than across, for a swipe (TASK-94)
export const SWIPE_MIN_PX = 30;
const SWIPE_DIRECTION_RATIO = 2;

// a vertical swipe by one finger over the prompt: up — an older history entry, down — a newer one;
// the prompt takes vertical drags itself (touch-action in styles), so the console doesn't scroll
export const usePromptSwipe = (onSwipe: (direction: "up" | "down") => void) => {
  const start = React.useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    // a second finger turns the swipe into a pinch (ConsolePage): it is not a swipe any more
    const touch = e.touches[0];
    start.current = e.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  };

  // touches are all the fingers on the screen: one put down off the prompt is seen here too
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 1) start.current = null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = start.current;
    start.current = null;
    const touch = e.changedTouches[0] as React.Touch | undefined;
    if (!from || !touch || e.touches.length > 0) return;
    const dx = touch.clientX - from.x;
    const dy = touch.clientY - from.y;
    if (Math.abs(dy) < SWIPE_MIN_PX || Math.abs(dy) < SWIPE_DIRECTION_RATIO * Math.abs(dx)) return;
    onSwipe(dy < 0 ? "up" : "down");
  };

  const onTouchCancel = () => {
    start.current = null;
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
};
