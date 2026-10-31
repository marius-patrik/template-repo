import { useEffect, useRef, type ComponentType, type Ref } from "react";
import {
  LayoutGridIcon,
  BlocksIcon,
  FolderOpenIcon,
  BotIcon,
  GitForkIcon,
  FileTextIcon,
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
type IconProps = { size?: number; animateOnHover?: boolean; ref?: Ref<IconHandle> };
const registry = {
  overview: LayoutGridIcon,
  workspace: BlocksIcon,
  projects: FolderOpenIcon,
  agents: BotIcon,
  graph: GitForkIcon,
  roadmap: BlocksIcon,
  artifacts: FileTextIcon,
  activity: HistoryIcon,
  context: FileTextIcon,
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
      <Icon ref={animation} size={size} animateOnHover={false} />
      {(name === "monaco" || name === "code") && <span className="code-icon-glyph">&lt;/&gt;</span>}
    </span>
  );
}
