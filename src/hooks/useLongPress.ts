import React from "react";

// how long a finger has to stay, and how far it may wander meanwhile (TASK-94)
export const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;
// the click a browser may send after a long press comes right after the finger is lifted; a later
// one (Enter on a focused button) is a click of its own
const CLICK_AFTER_RELEASE_MS = 400;

interface LongPressHandlers<Subject> {
  // what is pressed, found when the finger goes down (the element under it may be re-rendered
  // meanwhile); undefined: nothing to press there
  select: (target: Element) => Subject | undefined;
  // the finger has been held long enough: the press is taken, whatever comes next
  onHold: (subject: Subject) => void;
  // the held finger is lifted: browsers allow the clipboard on this, not on a timer (activation)
  onRelease: (subject: Subject) => void;
  // the held press is given up: the browser took the touch, another finger came
  onAbort: () => void;
}

// a long tap by one finger (touch only: a mouse selects text by holding). The browser's own long
// press (context menu) gives way to it, and the click after it doesn't press what is under the
// finger
export const useLongPress = <Subject>({
  select,
  onHold,
  onRelease,
  onAbort,
}: LongPressHandlers<Subject>) => {
  const press = React.useRef<{
    pointerId: number;
    x: number;
    y: number;
    subject: Subject;
    timer: ReturnType<typeof setTimeout>;
    isHeld: boolean;
    // a pointer anywhere else on the page (a pinch) gives the press up
    stopWatching: () => void;
  } | null>(null);
  // when the last held press was released: its click (if any) is swallowed
  const releasedAt = React.useRef(-Infinity);

  // the press is over; true if it had been held
  const finish = () => {
    const current = press.current;
    if (!current) return false;
    clearTimeout(current.timer);
    current.stopWatching();
    press.current = null;
    return current.isHeld;
  };
  const abort = () => {
    if (finish()) onAbort();
  };
  // a ref: the listener on the page outlives the render it was added in
  const abortRef = React.useRef(abort);
  React.useLayoutEffect(() => {
    abortRef.current = abort;
  });
  React.useEffect(() => () => void finish(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    abort();
    if (e.pointerType !== "touch" || !e.isPrimary || !(e.target instanceof Element)) return;
    const subject = select(e.target);
    if (subject === undefined) return;
    const { pointerId, clientX: x, clientY: y } = e;
    const timer = setTimeout(() => {
      if (!press.current) return;
      press.current.isHeld = true;
      window.getSelection()?.removeAllRanges();
      onHold(subject);
    }, LONG_PRESS_MS);
    const onOtherPointer = (other: PointerEvent) => {
      if (other.pointerId !== pointerId) abortRef.current();
    };
    document.addEventListener("pointerdown", onOtherPointer, true);
    const stopWatching = () => document.removeEventListener("pointerdown", onOtherPointer, true);
    press.current = { pointerId, x, y, subject, timer, isHeld: false, stopWatching };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const current = press.current;
    if (!current || current.isHeld || e.pointerId !== current.pointerId) return;
    if (Math.hypot(e.clientX - current.x, e.clientY - current.y) > MOVE_TOLERANCE_PX) finish();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const current = press.current;
    if (!current || e.pointerId !== current.pointerId || !finish()) return;
    releasedAt.current = Date.now();
    onRelease(current.subject);
  };

  // the browser took the touch (a selection, a scroll): no activation to copy with
  const onPointerCancel = (e: React.PointerEvent) => {
    if (press.current?.pointerId === e.pointerId) abort();
  };

  const isJustReleased = () => Date.now() - releasedAt.current < CLICK_AFTER_RELEASE_MS;

  const onClickCapture = (e: React.MouseEvent) => {
    if (!isJustReleased()) return;
    releasedAt.current = -Infinity;
    e.preventDefault();
    e.stopPropagation();
  };

  // Android opens the context menu on a long press; a right click stays the browser's
  const onContextMenu = (e: React.MouseEvent) => {
    if (press.current || isJustReleased()) e.preventDefault();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    onContextMenu,
  };
};
