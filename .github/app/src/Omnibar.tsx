import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useCanvasConfig } from "./config";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { VIEWS, type CanvasView } from "./views";
import context from "./generated/context.json";

type Placement = "up" | "down";
type Rect = { left: number; top: number; width: number; height: number };
export default function Omnibar({
  onNavigate, dragHandle, fallback = false, floating,
}: {
  onNavigate: (route: string) => void;
  dragHandle?: ReactNode;
  fallback?: boolean;
  floating?: { left: number; top: number };
} {
  const { t } = useTranslation();
  const prefs = useCanvasConfig((state) => state.preferences);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [placement, setPlacement] = useState<Placement>("down");
  const [rect, setRect] = useState<Rect>({ left: 0, top: 0, width: 340, height: 30 });
  const items = VIEWS.filter((view) =>
    (view.label + " " + context.name).toLowerCase().includes(query.toLowerCase().trim()));
  const dismiss = useCallback(() => { setOpen(false); setQuery(""); setSelected(0); inputRef.current?.blur(); }, []);
  const focus = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  useEffect(() => {
    window.addEventListener("canvas:omnibar-focus", focus);
    return () => window.removeEventListener("canvas:omnibar-focus", focus);
  }, [focus]);
  const place = useCallback(() => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const viewport = window.visualViewport?.height ?? window.innerHeight;
    const desired = Math.min(360, 60 + items.length * 40);
    const freeDown = viewport - bounds.bottom - 8;
    const freeUp = bounds.top - 8;
    const direction =
      prefs.commandPlacement === "up" ? (freeUp < 150 && freeDown > freeUp ? "down" : "up") :
      prefs.commandPlacement === "down" ? (freeDown < 150 && freeUp > freeDown ? "up" : "down") :
      freeDown >= desired || freeDown >= freeUp ? "down" : "up";
    setPlacement(direction);
    setRect({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height });
  }, [items.length, prefs.commandPlacement]);
  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const update = () => place();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new ResizeObserver(update);
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); dismiss(); }
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [open, dismiss]);
  const choose = (view: CanvasView) => {
    dismiss();
    onNavigate(`/${view}`);
  };
  const options = (
    <div
      className={`omnibar-results omnibar-results-${placement}`}
      role="listbox" id="canvas-omnibar-results" aria-label={t("Open navigation tree")}
      style={{
        left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 250) - 8)),
        width: Math.max(250, Math.min(rect.width, window.innerWidth - 16)),
        top: placement === "down" ? rect.top + rect.height : undefined,
        bottom: placement === "up" ? window.innerHeight - rect.top : undefined,
        maxHeight: placement === "down" ? Math.max(90, window.innerHeight - rect.top - rect.height - 10)
          : Math.max(90, rect.top - 10),
      }}
    >
      <div className="omnibar-results-list">
        {items.map((item, index) => (
          <button key={item.id} type="button" role="option" aria-selected={selected === index}
            className={selected === index ? "focused" : ""}
            onPointerDown={(event) => event.preventDefault()}
            onMouseEnter={() => setSelected(index)}
            onClick={() => choose(item.id)}>
            <AnimatedIcon name={item.id} size={16} />
            <span>{t(item.label)}</span>
            <small>{context.name}</small>
            <AnimatedIcon name="right" size={13} />
          </button>
        ))}
        {!items.length && <p className="empty-state">{t("No matching routes.")}</p>}
      </div>
      <footer className="omnibar-results-help">{t("↑ ↓ navigate · ↵ open · Esc dismiss")}</footer>
    </div>
  );
  return (
    <div className={`omnibar-shell ${open ? "omnibar-open" : ""} ${fallback ? "omnibar-fallback" : ""} ${floating ? "floating-omnibar" : ""}`}
      style={floating}
      data-testid="omnibar" ref={rootRef} data-open={open}>
      <AnimatedIcon name="search" size={16} />
      <input
        ref={inputRef} type="text" value={query}
        role="combobox" aria-expanded={open} aria-controls="canvas-omnibar-results"
        aria-autocomplete="list" aria-label={t("Do anything")}
        placeholder={t("Do anything")}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setSelected(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault(); setSelected((index) => Math.min(items.length - 1, index + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault(); setSelected((index) => Math.max(0, index - 1));
          } else if (event.key === "Enter" && items[selected]) {
            event.preventDefault(); choose(items[selected].id);
          }
        }}
      />
      {dragHandle ?? <kbd>⌘K</kbd>}
      {open && createPortal(
        <>
          <div className={`omnibar-backdrop ${prefs.commandBackdropBlur ? "blurred" : ""}`}
            aria-hidden="true" onPointerDown={dismiss} />
          {options}
        </>, document.body)}
    </div>
  );
}
