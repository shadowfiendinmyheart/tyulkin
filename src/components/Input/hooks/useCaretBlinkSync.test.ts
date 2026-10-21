import { afterEach, describe, expect, it, vi } from "vitest";
import { syncCaretBlink } from "./useCaretBlinkSync";

const fakeAnimation = (playState: AnimationPlayState, startTime: number | null) =>
  ({ playState, startTime }) as Animation;

const containerWith = (animations: Animation[]) => {
  const container = document.createElement("div");
  container.getAnimations = vi.fn(() => animations);
  return container;
};

describe("syncCaretBlink (TASK-100)", () => {
  afterEach(() => {
    // jsdom has no timeline of its own
    Reflect.deleteProperty(document, "timeline");
  });

  const setTimelineTime = (currentTime: number | null) =>
    Object.defineProperty(document, "timeline", { value: { currentTime }, configurable: true });

  it("restarts the caret and the inverted char on one start time", () => {
    setTimelineTime(5000);
    // the caret has just moved, the char under it kept an old phase
    const caret = fakeAnimation("running", 4980);
    const invertedChar = fakeAnimation("running", 1234);
    const container = containerWith([caret, invertedChar]);

    syncCaretBlink(container);

    expect(container.getAnimations).toHaveBeenCalledWith({ subtree: true });
    expect(caret.startTime).toBe(5000);
    expect(invertedChar.startTime).toBe(5000);
  });

  it("leaves paused animations (reduced motion) on their first keyframe", () => {
    setTimelineTime(5000);
    const caret = fakeAnimation("paused", null);

    syncCaretBlink(containerWith([caret]));

    expect(caret.startTime).toBeNull();
  });

  it("does nothing without the Web Animations API or an active timeline", () => {
    expect(() => syncCaretBlink(document.createElement("div"))).not.toThrow();

    setTimelineTime(null);
    const caret = fakeAnimation("running", 1234);
    syncCaretBlink(containerWith([caret]));
    expect(caret.startTime).toBe(1234);
  });
});
