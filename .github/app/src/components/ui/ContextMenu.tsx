import * as ContextMenu from "@radix-ui/react-context-menu";
import type { ReactNode } from "react";
import { AnimatedIcon } from "../AnimatedIcon";

export type ContextAction =
  | { type?: "item"; label: string; icon: string; action: () => void; disabled?: boolean }
  | { type: "separator" };

export function CanvasContextMenu({
  children,
  actions,
}: {
  children: ReactNode;
  actions: ContextAction[];
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content canvas-context-menu" collisionPadding={10}>
          {actions.map((item, index) =>
            item.type === "separator" ? (
              <ContextMenu.Separator key={`separator-${index}`} className="dock-add-separator" />
            ) : (
              <ContextMenu.Item
                key={`${item.label}-${index}`}
                className="menu-item context-action"
                disabled={item.disabled}
                onSelect={item.action}
              >
                <AnimatedIcon name={item.icon} size={16} />
                <span>{item.label}</span>
              </ContextMenu.Item>
            ),
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
