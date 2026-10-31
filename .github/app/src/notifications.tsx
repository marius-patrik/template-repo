import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslation } from "react-i18next";
import { toast, Toaster } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AnimatedIcon } from "./components/AnimatedIcon";

type Level = "success" | "info" | "warning" | "error";
type Notice = {
  id: string;
  level: Level;
  message: string;
  createdAt: number;
  read: boolean;
};

type NotificationState = {
  entries: Notice[];
  add: (level: Level, message: string) => void;
  markRead: () => void;
  clear: () => void;
};

const LIMIT = 40;
const isLevel = (value: unknown): value is Level =>
  value === "success" || value === "info" || value === "warning" || value === "error";

function restoreEntries(source: unknown): Notice[] {
  if (!Array.isArray(source)) return [];
  return source.slice(0, LIMIT).filter((value): value is Notice =>
    value && typeof value === "object"
    && typeof value.id === "string"
    && isLevel(value.level)
    && typeof value.message === "string"
    && value.message.length <= 500
    && Number.isFinite(value.createdAt)
    && typeof value.read === "boolean",
  );
}

/** Browser-local UI feedback, never fabricated repository or agent activity. */
export const useNotifications = create<NotificationState>()(
  persist(
    (set) => ({
      entries: [],
      add: (level, message) =>
        set((state) => ({
          entries: [
            {
              id: crypto.randomUUID(),
              level,
              message: message.slice(0, 500),
              createdAt: Date.now(),
              read: false,
            },
            ...state.entries,
          ].slice(0, LIMIT),
        })),
      markRead: () =>
        set((state) => ({ entries: state.entries.map((entry) => ({ ...entry, read: true })) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "canvas-notifications-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ entries: state.entries }),
      merge: (saved, current) => {
        const input = saved && typeof saved === "object" && "entries" in saved
          ? saved.entries : [];
        return { ...current, entries: restoreEntries(input) };
      },
    },
  ),
);

function publish(level: Level, message: string) {
  useNotifications.getState().add(level, message);
  toast[level](message);
}

export const notify = {
  success: (message: string) => publish("success", message),
  info: (message: string) => publish("info", message),
  error: (message: string) => publish("error", message),
  warning: (message: string) => publish("warning", message),
  dismiss: () => toast.dismiss(),
};

const levelIcons: Record<Level, string> = {
  success: "check",
  info: "bell",
  warning: "help",
  error: "close",
};

export function NotificationCenter() {
  const { t, i18n } = useTranslation();
  const entries = useNotifications((state) => state.entries);
  const unread = entries.filter((entry) => !entry.read).length;
  const markRead = useNotifications((state) => state.markRead);
  const clear = useNotifications((state) => state.clear);
  const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <DropdownMenu.Root onOpenChange={(open) => { if (open) markRead(); }}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="canvas-button canvas-button-icon canvas-button-ghost notification-trigger"
          aria-label={t("Notifications")}
          title={t("Notifications")}
          data-testid="notification-trigger"
        >
          <AnimatedIcon name="bell" size={17} />
          {unread > 0 && <span className="notification-unread" aria-label={t("Unread notifications: {{count}}", { count: unread })}>{unread > 9 ? "9+" : unread}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="menu-content notification-center"
          align="end"
          sideOffset={7}
          collisionPadding={10}
          aria-label={t("Notifications")}
          data-testid="notification-center"
        >
          <div className="notification-heading">
            <strong>{t("Notifications")}</strong>
            <span>{entries.length}</span>
          </div>
          <div className="notification-history">
            {entries.length === 0 ? (
              <p className="notification-empty">{t("No notifications yet")}</p>
            ) : entries.map((entry) => (
              <div className="notification-entry" key={entry.id}>
                <AnimatedIcon name={levelIcons[entry.level]} size={16} />
                <span className="notification-description">
                  <span>{entry.message}</span>
                  <small>{formatter.format(entry.createdAt)}</small>
                </span>
              </div>
            ))}
          </div>
          {entries.length > 0 && (
            <>
              <DropdownMenu.Separator className="dock-add-separator" />
              <DropdownMenu.Item className="menu-item notification-clear" onSelect={clear}>
                <AnimatedIcon name="close" size={15} />
                {t("Clear notifications")}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Notifications() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      visibleToasts={4}
      duration={3500}
      theme="system"
      className="canvas-notification-root"
      toastOptions={{ className: "canvas-toast" }}
    />
  );
}
