import * as Popover from "@radix-ui/react-popover";
import { colord } from "colord";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { useState } from "react";

export const accentPresets = [
  { name: "Neutral", id: "neutral", hex: "#f4f4f5" },
  { name: "Blue", id: "blue", hex: "#81adf1" },
  { name: "Sage", id: "sage", hex: "#a3c3ac" },
  { name: "Violet", id: "violet", hex: "#b5a4ec" },
  { name: "Amber", id: "amber", hex: "#edbb79" },
] as const;

export function AccentColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const custom = value.startsWith("#");
  const current = custom
    ? value
    : (accentPresets.find((preset) => preset.id === value)?.hex ?? "#81adf1");
  const update = (color: string) => {
    if (colord(color).isValid()) onChange(colord(color).toHex());
  };

  return (
    <div className="accent-controls">
      <div className="accent-swatches" role="group" aria-label="Accent color presets">
        {accentPresets.map((preset) => (
          <button
            type="button"
            key={preset.id}
            title={preset.name}
            aria-label={`Use ${preset.name} accent`}
            aria-pressed={value === preset.id}
            className={`accent-swatch ${value === preset.id ? "selected" : ""}`}
            style={{ backgroundColor: preset.hex }}
            onClick={() => onChange(preset.id)}
          >
            {value === preset.id && <span className="swatch-mark" />}
          </button>
        ))}
      </div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`accent-custom-trigger ${custom ? "selected" : ""}`}
            aria-label="Choose custom accent color"
          >
            <span className="accent-custom-swatch" style={{ backgroundColor: current }} />
            <span>{custom ? value.toUpperCase() : "Custom"}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={10}
            align="end"
            collisionPadding={12}
            className="accent-popover"
            aria-label="Custom accent color"
          >
            <div className="color-popover-heading">
              <strong>Custom accent</strong>
              <span>HEX · RGB opaque</span>
            </div>
            <HexColorPicker color={current} onChange={update} aria-label="Accent color picker" />
            <label className="accent-hex-label" htmlFor="canvas-accent-hex">
              Hexadecimal
            </label>
            <HexColorInput
              id="canvas-accent-hex"
              prefixed
              color={current}
              onChange={update}
              className="accent-hex-input"
              aria-label="Accent color hex value"
            />
            <p className="accent-note">Applied immediately to this browser only.</p>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
