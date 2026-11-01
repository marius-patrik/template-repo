import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvasConfig } from "./config";

type Drag = {
  id: number;
  pointerX: number;
  pointerY: number;
  x: number;
  y: number;
  nextX: number;
  nextY: number;
  root: HTMLElement;
  frame: number;
};

/** Pointer movement never renders React or writes localStorage. */
export function useFloatingOmnibar() {
  const drag = useRef<Drag | null>(null);
  const setPreferences = useCanvasConfig((state) => state.setPreferences);
  const update = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const item = drag.current;
    if (!item || item.id !== event.pointerId) return;
    const width = item.root.offsetWidth;
    const height = item.root.offsetHeight;
    item.nextX = Math.round(
      Math.max(
        8,
        Math.min(
          window.innerWidth - Math.min(width, window.innerWidth) - 8,
          item.x + event.clientX - item.pointerX,
        ),
      ),
    );
    item.nextY = Math.round(
      Math.max(
        8,
        Math.min(window.innerHeight - height - 8, item.y + event.clientY - item.pointerY),
      ),
    );
    if (!item.frame) {
      item.frame = requestAnimationFrame(() => {
        const active = drag.current;
        if (!active) return;
        active.frame = 0;
        active.root.style.transform = `translate3d(${active.nextX - active.x}px, ${active.nextY - active.y}px, 0)`;
        // Open command results are children of the translated surface.
        // Re-evaluation is only necessary when the bar approaches a viewport edge.
        if (active.nextY < 170 || active.nextY > window.innerHeight - 320)
          window.dispatchEvent(new Event("canvas:omnibar-reposition"));
      });
    }
  }, []);

  const start = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const root = event.currentTarget.closest<HTMLElement>(".omnibar-shell");
    if (!root) return;
    event.preventDefault();
    const prefs = useCanvasConfig.getState().preferences;
    drag.current = {
      id: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: prefs.floatingX,
      y: prefs.floatingY,
      nextX: prefs.floatingX,
      nextY: prefs.floatingY,
      root,
      frame: 0,
    };
    document.body.classList.add("cx-dragging");
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const end = useCallback(() => {
    const item = drag.current;
    drag.current = null;
    document.body.classList.remove("cx-dragging");
    if (!item) return;
    if (item.frame) cancelAnimationFrame(item.frame);
    const x = item.nextX;
    const y = item.nextY;
    if (x !== item.x || y !== item.y) {
      setPreferences({ floatingX: x, floatingY: y });
      requestAnimationFrame(() => {
        item.root.style.transform = "";
        window.dispatchEvent(new Event("canvas:omnibar-reposition"));
      });
    } else {
      item.root.style.transform = "";
    }
  }, [setPreferences]);
  useEffect(
    () => () => {
      if (drag.current?.frame) cancelAnimationFrame(drag.current.frame);
      document.body.classList.remove("cx-dragging");
    },
    [],
  );
  return { start, update, end };
}
