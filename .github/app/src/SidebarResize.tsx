import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { useCanvasConfig } from "./config";

const clamp = (width: number) => Math.round(Math.max(180, Math.min(480, width)));
type Drag = { id: number; x: number; width: number; next: number; frame: number };

/** Resizes a CSS variable directly; only settled dimensions are persisted. */
export default function SidebarResize() {
  const { t } = useTranslation();
  const width = useCanvasConfig((s) => s.preferences.sidebarWidth);
  const side = useCanvasConfig((s) => s.preferences.sidebarPosition);
  const set = useCanvasConfig((s) => s.setPreferences);
  const drag = useRef<Drag | null>(null);
  const start = useCallback((event: PointerEvent<HTMLHRElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = { id: event.pointerId, x: event.clientX, width, next: width, frame: 0 };
    document.body.classList.add("cx-resizing");
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [width]);
  const move = useCallback((event: PointerEvent<HTMLHRElement>) => {
    const item = drag.current;
    if (!item || item.id !== event.pointerId) return;
    const sign = side === "left" ? 1 : -1;
    item.next = clamp(item.width + sign * (event.clientX - item.x));
    if (!item.frame) {
      item.frame = requestAnimationFrame(() => {
        if (!drag.current) return;
        drag.current.frame = 0;
        document.documentElement.style.setProperty("--cx-sidebar-width", `${drag.current.next}px`);
      });
    }
  }, [side]);
  const end = useCallback(() => {
    const item = drag.current;
    drag.current = null;
    document.body.classList.remove("cx-resizing");
    if (!item) return;
    if (item.frame) cancelAnimationFrame(item.frame);
    if (item.next !== item.width) set({ sidebarWidth: item.next });
    document.documentElement.style.setProperty("--cx-sidebar-width", `${item.next}px`);
  }, [set]);
  const keyboard = useCallback((event: KeyboardEvent<HTMLHRElement>) => {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    let next = width;
    if (direction) next = clamp(width + direction * (side === "right" ? -16 : 16));
    else if (event.key === "Home") next = 180;
    else if (event.key === "End") next = 480;
    else return;
    event.preventDefault();
    set({ sidebarWidth: next });
  }, [side, set, width]);
  useEffect(() => {
    document.documentElement.style.setProperty("--cx-sidebar-width", `${width}px`);
  }, [width]);
  useEffect(() => () => {
    document.body.classList.remove("cx-resizing");
    if (drag.current?.frame) cancelAnimationFrame(drag.current.frame);
  }, []);
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
      onPointerMove={move}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={end}
      onDoubleClick={() => set({ sidebarWidth: 228 })}
      onKeyDown={keyboard}
    />
  );
}
