import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { CanvasSelect } from "./components/ui/CanvasSelect";
import { CanvasContextMenu, type ContextAction } from "./components/ui/ContextMenu";
import { useCanvasConfig, POSITIONS, type CanvasPreferences } from "./config";
import { useProfiles } from "./profiles";
import { notify } from "./notifications";
import { VIEWS, type CanvasView, viewLabel } from "./views";
import context from "./generated/context.json";

/** Right click moves a surface; ordinary clicks keep its primary action. */
export function SurfaceMenu({
  children,
  kind,
}: {
  children: ReactNode;
  kind: "navigation" | "omnibar" | "settings" | "activity" | "sidebar";
}) {
  const set = useCanvasConfig((state) => state.setPreferences);
  const { t } = useTranslation();
  const key = {
    navigation: "navigationPosition",
    omnibar: "omnibarPosition",
    settings: "settingsPosition",
    activity: "activityBarPosition",
    sidebar: "sidebarPosition",
  } as const;
  const label = {
    navigation: "Navigation position",
    omnibar: "Omnibar position",
    settings: "Settings position",
    activity: "Activity bar position",
    sidebar: "Primary sidebar position",
  }[kind];
  return (
    <CanvasContextMenu
      actions={POSITIONS[kind].map((position) => ({
        label: t(label) + " · " + t(position.charAt(0).toUpperCase() + position.slice(1)),
        icon: "move",
        action: () => set({ [key[kind]]: position } as Partial<CanvasPreferences>),
      }))}
    >
      {children}
    </CanvasContextMenu>
  );
}
export function ProfileSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  const { profiles, currentId, createProfile, renameProfile, removeProfile } = useProfiles();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"create" | "rename" | "delete" | null>(null);
  const [open, setOpen] = useState(false);
  const current = profiles.find((p) => p.id === currentId) ?? profiles[0];
  const submit = () => {
    if (mode === "create") {
      const id = createProfile(name);
      if (id) {
        onSelect(id);
        notify.success(t("Profile created"));
      }
    } else if (mode === "rename") {
      renameProfile(currentId, name);
      notify.info(t("Profile renamed"));
    }
    setOpen(false);
    setName("");
    setMode(null);
  };
  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMode(null);
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="canvas-select-trigger title-profile-select"
          aria-label={t("Profile")}
          data-testid="profile-select"
        >
          <AnimatedIcon name="profile" size={15} />
          <strong>{current?.name ?? t("Profile")}</strong>
          <AnimatedIcon name="down" size={13} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="menu-content profile-menu"
          sideOffset={6}
          align="start"
          collisionPadding={10}
        >
          <DropdownMenu.Label className="dock-add-group-label">{t("Profiles")}</DropdownMenu.Label>
          {profiles.map((p) => (
            <DropdownMenu.Item
              key={p.id}
              className="menu-item profile-menu-item"
              onSelect={() => onSelect(p.id)}
            >
              <AnimatedIcon name={p.id === currentId ? "check" : "profile"} size={15} />
              <span>{p.name}</span>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="dock-add-separator" />
          <DropdownMenu.Item
            className="menu-item"
            onSelect={(event) => {
              event.preventDefault();
              setMode("create");
              setName("");
            }}
          >
            <AnimatedIcon name="plus" size={15} />
            {t("New profile")}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="menu-item"
            onSelect={(event) => {
              event.preventDefault();
              setMode("rename");
              setName(current.name);
            }}
          >
            <AnimatedIcon name="edit" size={15} />
            {t("Rename profile")}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="menu-item"
            disabled={profiles.length === 1}
            onSelect={(event) => {
              event.preventDefault();
              setMode("delete");
            }}
          >
            <AnimatedIcon name="close" size={15} />
            {t("Delete profile")}
          </DropdownMenu.Item>
          {(mode === "create" || mode === "rename") && (
            <form
              className="profile-menu-form"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <input
                aria-label={t("Profile name")}
                placeholder={t("Profile name")}
                maxLength={48}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <button type="submit" aria-label={t("Save profile")} disabled={!name.trim()}>
                <AnimatedIcon name="check" size={16} />
              </button>
            </form>
          )}
          {mode === "delete" && (
            <div className="profile-delete">
              <small>{t("Delete profile and its local workspace layout?")}</small>
              <button
                type="button"
                onClick={() => {
                  removeProfile(currentId);
                  const next = profiles.find((p) => p.id !== currentId);
                  if (next) onSelect(next.id);
                  setOpen(false);
                  setMode(null);
                  notify.info(t("Profile deleted"));
                }}
              >
                {t("Confirm delete")}
              </button>
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function Navigator({
  current,
  onNavigate,
  onProfile,
}: {
  current: CanvasView | null;
  onNavigate: (route: string) => void;
  onProfile: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav
      className="title-navigation"
      aria-label={t("Workspace navigation")}
      data-testid="profile-navigation"
    >
      <ProfileSelector onSelect={onProfile} />
      <AnimatedIcon name="right" size={13} />
      <CanvasSelect
        label={t("Repository")}
        value={context.repository}
        options={[{ value: context.repository, label: context.name }]}
        onValueChange={() => {}}
        className="title-repository-select"
      />
      <AnimatedIcon name="right" size={13} />
      <CanvasSelect
        label={t("View")}
        value={current ?? "__empty"}
        options={[
          { value: "__empty", label: t("No open tab") },
          ...VIEWS.map((v) => ({ value: v.id, label: t(v.label) })),
        ]}
        onValueChange={(view) => onNavigate(view === "__empty" ? "/" : `/${view}`)}
        className="title-view-select"
        testId="breadcrumb-view"
      />
    </nav>
  );
}
export function NavigationTree({
  current,
  onNavigate,
}: {
  current: CanvasView | null;
  onNavigate: (route: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className="navigation-tree" aria-label={t("Navigation tree")}>
      {VIEWS.map((item) => (
        <button
          type="button"
          key={item.id}
          title={t(item.label)}
          className={`navigation-tree-item ${current === item.id ? "active" : ""}`}
          onClick={() => onNavigate(`/${item.id}`)}
        >
          <AnimatedIcon name={item.id} size={16} />
          <span>{t(item.label)}</span>
        </button>
      ))}
    </nav>
  );
}
export function OmnibarTrigger({ open }: { open: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="omnibar-trigger"
      aria-label={t("Search pages and commands")}
      title={t("Search pages and commands")}
      onClick={open}
    >
      <AnimatedIcon name="search" size={16} />
      <span>{t("Search pages and commands")}</span>
      <kbd>⌘K</kbd>
    </button>
  );
}
export function ActivityBar({
  current,
  onNavigate,
  showSettings,
}: {
  current: CanvasView | null;
  onNavigate: (path: string) => void;
  showSettings: boolean;
}) {
  const { t } = useTranslation();
  const prefs = useCanvasConfig((state) => state.preferences);
  const pinned = useProfiles(
    (state) => state.profiles.find((p) => p.id === state.currentId)?.pinned ?? [],
  );
  const togglePin = useProfiles((state) => state.togglePin);
  const shortcuts = ["notepad", "library"] as CanvasView[];
  const entries = [...new Set([...shortcuts, ...pinned])];
  return (
    <div
      className={`activity-bar activity-${prefs.activityBarDensity}`}
      role="toolbar"
      aria-label={t("Activity bar")}
      data-testid="activity-bar"
    >
      {entries.map((view) => {
        const actions: ContextAction[] = [
          { label: t("Open"), icon: view, action: () => onNavigate(`/${view}`) },
          {
            label: t(pinned.includes(view) ? "Unpin from activity bar" : "Pin to activity bar"),
            icon: "pin",
            action: () => togglePin(view),
          },
          { type: "separator" },
          ...POSITIONS.activity.map((position) => ({
            label: t("Activity bar position") + " · " + t(position),
            icon: "move",
            action: () =>
              useCanvasConfig.getState().setPreferences({ activityBarPosition: position }),
          })),
        ];
        return (
          <CanvasContextMenu key={view} actions={actions}>
            <button
              type="button"
              className={`activity-button ${current === view ? "active" : ""}`}
              title={t(viewLabel(view))}
              aria-label={t(viewLabel(view))}
              onClick={() => onNavigate(`/${view}`)}
            >
              <AnimatedIcon name={view} size={prefs.iconSize} />
            </button>
          </CanvasContextMenu>
        );
      })}
      <div className="activity-spacer" />
      {showSettings && (
        <SurfaceMenu kind="settings">
          <button
            type="button"
            className="activity-button"
            title={t("Settings")}
            aria-label={t("Settings")}
            onClick={() => onNavigate("/settings")}
          >
            <AnimatedIcon name="settings" size={prefs.iconSize} />
          </button>
        </SurfaceMenu>
      )}
    </div>
  );
}
export function SidebarContents({
  current,
  onNavigate,
}: {
  current: CanvasView | null;
  onNavigate: (path: string) => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const prefs = useCanvasConfig((state) => state.preferences);
  if (prefs.navigationPosition === "sidebar")
    return <NavigationTree current={current} onNavigate={onNavigate} />;
  if (
    !current ||
    !["library", "monaco", "artifacts", "context", "agents", "roadmap"].includes(current)
  )
    return null;
  return (
    <div className="sidebar-source-list">
      <label className="sidebar-panel-heading" htmlFor="sidebar-source-filter">
        {t("Source documents")}
      </label>
      <input
        id="sidebar-source-filter"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t("Filter documents")}
        className="sidebar-source-filter"
      />
      {context.documents
        .filter((doc) => doc.path.toLowerCase().includes(filter.toLowerCase()))
        .map((doc) => (
          <button
            key={doc.path}
            className="source-tree-item"
            type="button"
            title={doc.path}
            onClick={() => onNavigate("/artifacts?file=" + encodeURIComponent(doc.path))}
          >
            <AnimatedIcon name="artifacts" size={15} />
            <span>{doc.path.split("/").at(-1)}</span>
          </button>
        ))}
    </div>
  );
}
export function Notepad() {
  const { t } = useTranslation();
  const profile = useProfiles((state) => state.profiles.find((p) => p.id === state.currentId));
  const setNote = useProfiles((state) => state.setNote);
  return (
    <div className="notepad-pane" data-testid="notepad-editor">
      <div className="editor-heading">
        <AnimatedIcon name="notepad" size={16} />
        <span>{t("Notepad")}</span>
        <span className="muted">{t("Local to this profile")}</span>
      </div>
      <textarea
        aria-label={t("Notepad")}
        spellCheck
        placeholder={t("Start writing…")}
        value={profile?.note ?? ""}
        onChange={(event) => setNote(event.target.value)}
      />
    </div>
  );
}
export function Library({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const docs = context.documents.filter((doc) =>
    doc.path.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page library-page" data-testid="library-view">
      <header className="page-intro">
        <p className="eyebrow">{t("Repository snapshot")}</p>
        <h1>{t("Library")}</h1>
        <p className="muted">{t("Source-backed documents")}</p>
      </header>
      <input
        className="library-search"
        aria-label={t("Search documents")}
        placeholder={t("Search documents")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="library-list">
        {docs.map((doc) => (
          <button
            type="button"
            key={doc.path}
            onClick={() => onNavigate("/artifacts?file=" + encodeURIComponent(doc.path))}
          >
            <AnimatedIcon name="artifacts" size={17} />
            <span>{doc.path}</span>
            <AnimatedIcon name="right" size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
