import type { ComponentType } from "react";
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
  ChevronRightIcon,
  ChevronDownIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
  MoonIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  ArrowRightIcon,
} from "lucide-animated";

const registry: Record<string, ComponentType<{ size?: number }>> = {
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
  right: ChevronRightIcon,
  down: ChevronDownIcon,
  collapse: PanelLeftCloseIcon,
  expand: PanelLeftOpenIcon,
  sun: SunIcon,
  moon: MoonIcon,
  check: CircleCheckIcon,
  help: CircleHelpIcon,
  arrow: ArrowRightIcon,
};
export function AnimatedIcon({
  name,
  size = 18,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = registry[name] ?? CircleHelpIcon;
  return (
    <span className={className ?? "app-icon"} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
