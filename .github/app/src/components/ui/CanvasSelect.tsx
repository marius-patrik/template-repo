import * as Select from "@radix-ui/react-select";
import { AnimatedIcon } from "../AnimatedIcon";

export type CanvasOption = { value: string; label: string };
export function CanvasSelect({
  value,
  options,
  onValueChange,
  label,
  className,
  testId,
}: {
  value: string;
  options: readonly CanvasOption[];
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
  testId?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={label}
        data-testid={testId}
        className={`canvas-select-trigger ${className ?? ""}`}
      >
        <Select.Value />
        <Select.Icon><AnimatedIcon name="down" size={14} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="menu-content canvas-select-content" position="popper" sideOffset={5} collisionPadding={8}>
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="canvas-select-item">
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator><AnimatedIcon name="check" size={14} /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
