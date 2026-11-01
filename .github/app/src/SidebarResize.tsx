import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { useCanvasConfig } from "./config";

const clamp = (width: number) => Math.round(Math.max(180, Math.min(480, width)));
type Drag = {
  id: number;
  startX: number;
  startWidth: number;
  nextWidth: number;
  frame: number;
  finish: () => void;
};

/** Pointer tracking is attached to the window; React rerenders cannot drop the drag.
 * CSS is updated in rAF and the settled value is persisted once on release. */
export default function SidebarResize() {
  const { t } = useTranslation();
  const width = useCanvasConfig((state) => state.preferences.sidebarWidth);
  const side = useCanvasConfig((state) => state.preferences.sidebarPosition);
  const set = useCanvasConfig((state) => state.setPreferences);
  const drag = useRef<Drag | null>(null);

  const start = useCallback(
    (event: PointerEvent<HTMLHRElement>) => {
      if (event.button !== 0 || drag.current) return;
      event.preventDefault();
      const id = event.pointerId;
      const startX = event.clientX;
      const startWidth = width;
      const sign = side === "left" ? 1 : -1;
      const onMove = (current: globalThis.PointerEvent) => {
        const state = drag.current;
        if (!state || current.pointerId !== state.id) return;
        state.nextWidth = clamp(startWidth + sign * (current.clientX - startX));
        if (state.frame) return;
        state.frame = requestAnimationFrame(() => {
          const active = drag.current;
          if (!active) return;
          active.frame = 0;
          document.documentElement.style.setProperty("--cx-sidebar-width", `${active.nextWidth}px`);
        });
      };
      const finish = () => {
        const state = drag.current;
        drag.current = null;
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onEnd, true);
        window.removeEventListener("pointercancel", onEnd, true);
        document.body.classList.remove("cx-resizing");
        if (!state) return;
        if (state.frame) cancelAnimationFrame(state.frame);
        document.documentElement.style.setProperty("--cx-sidebar-width", `${state.nextWidth}px`);
        if (state.nextWidth !== state.startWidth) set({ sidebarWidth: state.nextWidth });
      };
      const onEnd = (current: globalThis.PointerEvent) => {
        if (current.pointerId === id) finish();
      };
      drag.current = {
        id,
        startX,
        startWidth,
        nextWidth: startWidth,
        frame: 0,
        finish,
      };
      document.body.classList.add("cx-resizing");
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onEnd, true);
      window.addEventListener("pointercancel", onEnd, true);
    },
    [set, side, width],
  );
  const keyboard = useCallback(
    (event: KeyboardEvent<HTMLHRElement>) => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      let next = width;
      if (direction) next = clamp(width + direction * (side === "right" ? -16 : 16));
      else if (event.key === "Home") next = 180;
      else if (event.key === "End") next = 480;
      else return;
      event.preventDefault();
      set({ sidebarWidth: next });
    },
    [set, side, width],
  );
  useEffect(() => {
    if (!drag.current)
      document.documentElement.style.setProperty("--cx-sidebar-width", `${width}px`);
  }, [width]);
  useEffect(
    () => () => {
      drag.current?.finish();
      document.body.classList.remove("cx-resizing");
    },
    [],
  );
  return (
    <hr
      className="cx-resizer sidebar-resizer"
      aria-label={t("Resize sidebar")}
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={180}
      aria-valuemax={480}
      tabIndex={0}
      onPointerDown={start}
      onDoubleClick={() => set({ sidebarWidth: 228 })}
      onKeyDown={keyboard}
    />
  );
}
