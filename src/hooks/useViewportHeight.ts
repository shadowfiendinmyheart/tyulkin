import React from "react";

// the visible part of the screen as CSS variables on <html> (TASK-92): --viewport-height and
// --viewport-offset-top. Chrome shrinks the layout under the virtual keyboard by itself
// (interactive-widget=resizes-content in index.html), Safari only shrinks the visual viewport and
// scrolls it: there the page follows it by these variables. onResize runs when the height changes
export const useViewportHeight = (onResize: (previousHeight: number, height: number) => void) => {
  const onResizeRef = React.useRef(onResize);
  React.useLayoutEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const { style } = document.documentElement;
    let height: number | undefined;
    let offsetTop: number | undefined;
    const update = () => {
      // a pinch zoom shrinks the visual viewport too: the page keeps its size then
      if (Math.abs(viewport.scale - 1) > 0.01) return;
      // Safari fires many scroll events while panning: the styles are recalculated on changes only
      if (offsetTop !== viewport.offsetTop) {
        offsetTop = viewport.offsetTop;
        style.setProperty("--viewport-offset-top", `${offsetTop}px`);
      }
      if (height === viewport.height) return;
      const previousHeight = height;
      height = viewport.height;
      style.setProperty("--viewport-height", `${height}px`);
      if (previousHeight !== undefined) onResizeRef.current(previousHeight, height);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      style.removeProperty("--viewport-height");
      style.removeProperty("--viewport-offset-top");
    };
  }, []);
};
