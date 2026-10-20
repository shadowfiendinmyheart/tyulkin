import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, THEME_ORIGIN_ATTRIBUTE, THEME_TRANSITION_CLASS } from "./themeTransition";

const root = document.documentElement;

// jsdom has neither View Transitions nor Web Animations: a transition that runs its update at once
const mockViewTransitions = () => {
  const startViewTransition = vi.fn((update: () => void) => {
    update();
    return { ready: Promise.resolve(), finished: Promise.resolve() } as unknown as ViewTransition;
  });
  const animate = vi.fn();
  Object.assign(document, { startViewTransition });
  Object.assign(root, { animate });
  return { startViewTransition, animate };
};

// jsdom has no matchMedia
const mockReducedMotion = (matches: boolean) => vi.stubGlobal("matchMedia", () => ({ matches }));

describe("applyTheme (TASK-84)", () => {
  beforeEach(() => {
    root.dataset.theme = "Black";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "startViewTransition");
    Reflect.deleteProperty(root, "animate");
    delete root.dataset.theme;
    document.body.innerHTML = "";
  });

  it("sets the theme at once without View Transitions", () => {
    applyTheme("Nord", true);
    expect(root.dataset.theme).toBe("Nord");
  });

  it("spreads the theme as a circle from the prompt", async () => {
    const { startViewTransition, animate } = mockViewTransitions();
    mockReducedMotion(false);
    const prompt = document.createElement("span");
    prompt.setAttribute(THEME_ORIGIN_ATTRIBUTE, "");
    prompt.getBoundingClientRect = () => ({ left: 10, top: 20, width: 10, height: 20 }) as DOMRect;
    document.body.append(prompt);

    applyTheme("Nord", true);
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(root.dataset.theme).toBe("Nord");
    expect(root.classList.contains(THEME_TRANSITION_CLASS)).toBe(true);
    await vi.waitFor(() => expect(animate).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(root.classList.contains(THEME_TRANSITION_CLASS)).toBe(false));
    const [keyframes, options] = animate.mock.calls[0];
    expect(keyframes.clipPath[0]).toBe("circle(0 at 15px 30px)");
    expect(options).toMatchObject({ pseudoElement: "::view-transition-new(root)" });
  });

  it("sets the theme at once with reduced motion, unanimated, or as the first one", () => {
    const { startViewTransition } = mockViewTransitions();
    mockReducedMotion(true);
    applyTheme("Nord", true);
    expect(root.dataset.theme).toBe("Nord");

    mockReducedMotion(false);
    applyTheme("Dark", false);
    expect(root.dataset.theme).toBe("Dark");

    delete root.dataset.theme;
    applyTheme("Gruvbox", true);
    expect(root.dataset.theme).toBe("Gruvbox");
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it("keeps the latest theme when one comes before the screen of a transition is captured", () => {
    mockReducedMotion(false);
    let update = () => undefined as void;
    const startViewTransition = vi.fn((callback: () => void) => {
      update = callback;
      return { ready: new Promise(() => undefined), finished: Promise.resolve() };
    });
    Object.assign(document, { startViewTransition });

    applyTheme("Nord", true);
    expect(root.dataset.theme).toBe("Black");
    // back to the shown theme while Nord waits: not taken for the shown one
    applyTheme("Black", false);
    update();
    expect(root.dataset.theme).toBe("Black");
  });

  it("does nothing for the shown theme", () => {
    const { startViewTransition } = mockViewTransitions();
    mockReducedMotion(false);
    applyTheme("Black", true);
    expect(startViewTransition).not.toHaveBeenCalled();
  });
});
