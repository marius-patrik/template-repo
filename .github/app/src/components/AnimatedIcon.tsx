import { forwardRef, useEffect, useImperativeHandle, useRef, type ComponentType, type Ref } from "react";
import { useCanvasConfig } from "../config";
import {
  LayoutGridIcon,
  BlocksIcon,
  FolderOpenIcon,
  BotIcon,
  GitForkIcon,
  FileTextIcon,
  FilePenLineIcon,
  UserRoundCogIcon,
  BookmarkIcon,
  SquarePenIcon,
  HistoryIcon,
  SettingsIcon,
  SearchIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
  MoonIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  ArrowRightIcon,
  PanelRightOpenIcon,
  RotateCcwIcon,
  BellIcon,
  GripHorizontalIcon,
  CopyIcon,
  XIcon,
} from "lucide-animated";

type IconHandle = { startAnimation: () => void; stopAnimation: () => void };
/** A small shelf of books, consistent with the line icons without relying on an absent package export. */
const BookshelfIcon = forwardRef<IconHandle, { size?: number }>(function BookshelfIcon(
  { size = 18 },
  ref,
) {
  const node = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => ({
    startAnimation: () => {
      node.current?.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-1px)" }, { transform: "translateY(0)" }],
        { duration: 240, easing: "ease-out" },
      );
    },
    stopAnimation: () => {
      node.current?.getAnimations().forEach((animation) => {
        animation.cancel();
      });
    },
  }));
  return (
    <svg ref={node} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <rect x="3.5" y="4.5" width="4" height="15" rx="1" />
      <path d="M11 5v14M14.5 5v14M17 6l3.5 13M2.5 20h19" />
    </svg>
  );
});
type IconProps = { size?: number; animateOnHover?: boolean; ref?: Ref<IconHandle> };
const registry = {
  overview: LayoutGridIcon,
  workspace: BlocksIcon,
  projects: FolderOpenIcon,
  agents: BotIcon,
  graph: GitForkIcon,
  canvas: GitForkIcon,
  editor: SquarePenIcon,
  roadmap: BlocksIcon,
  artifacts: FileTextIcon,
  activity: HistoryIcon,
  context: FileTextIcon,
  library: BookshelfIcon,
  notepad: FilePenLineIcon,
  profile: UserRoundCogIcon,
  edit: SquarePenIcon,
  pin: BookmarkIcon,
  move: PanelRightOpenIcon,
  settings: SettingsIcon,
  search: SearchIcon,
  plus: PlusIcon,
  right: ChevronRightIcon,
  down: ChevronDownIcon,
  collapse: PanelLeftCloseIcon,
  expand: PanelLeftOpenIcon,
  sun: SunIcon,
  moon: MoonIcon,
  check: CircleCheckIcon,
  help: CircleHelpIcon,
  arrow: ArrowRightIcon,
  split: PanelRightOpenIcon,
  reset: RotateCcwIcon,
  code: FileTextIcon,
  monaco: FileTextIcon,
  bell: BellIcon,
  more: GripHorizontalIcon,
  copy: CopyIcon,
  close: XIcon,
} satisfies Record<string, ComponentType<{ size?: number }>>;

/** Drive the real lucide-animated motion from the *whole* interactive parent,
 * not merely the tiny SVG hitbox. Keyboard focus gets the same feedback. */
export function AnimatedIcon({
  name,
  size = 18,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const scaledIconSize = useCanvasConfig((state) => state.preferences.iconSize);
  const actualSize = Math.max(10, Math.round((size * scaledIconSize) / 18));
  const node = useRef<HTMLSpanElement>(null);
  const animation = useRef<IconHandle>(null);
  const Icon = (registry[name as keyof typeof registry] ??
    CircleHelpIcon) as ComponentType<IconProps>;
  useEffect(() => {
    const parent =
      node.current?.closest(
        "button, a, [role='tab'], [role='menuitem'], [data-animated-icon-trigger]",
      ) ?? node.current;
    if (!parent) return;
    const start = () => animation.current?.startAnimation();
    const stop = () => animation.current?.stopAnimation();
    parent.addEventListener("pointerenter", start);
    parent.addEventListener("pointerleave", stop);
    parent.addEventListener("focusin", start);
    parent.addEventListener("focusout", stop);
    return () => {
      parent.removeEventListener("pointerenter", start);
      parent.removeEventListener("pointerleave", stop);
      parent.removeEventListener("focusin", start);
      parent.removeEventListener("focusout", stop);
    };
  }, []);
  return (
    <span
      ref={node}
      className={className ?? "app-icon"}
      aria-hidden="true"
      data-code-icon={name === "monaco" || name === "code" ? "true" : undefined}
    >
      <Icon ref={animation} size={actualSize} animateOnHover={false} />
      {(name === "monaco" || name === "code") && <span className="code-icon-glyph">&lt;/&gt;</span>}
    </span>
  );
}
