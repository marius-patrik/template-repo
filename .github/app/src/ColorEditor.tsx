import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { HexColorInput, HexColorPicker, HslColorPicker } from "react-colorful";
import { colord } from "colord";
import { useTranslation } from "react-i18next";
import { AnimatedIcon } from "./components/AnimatedIcon";
import type { ColorKey } from "./config";

const SWATCHES = ["#000000","#FFFFFF","#0086FF","#2563EB","#7C3AED","#EC4899","#FF1900","#F59E0B","#10B981","#1A1A1D","#373739","#929299"];
type Mode = "hex" | "rgb" | "hsl";
type Channel = "r" | "g" | "b" | "h" | "s" | "l";

export default function ColorEditor({
  name, value, onChange,
}: { name: ColorKey; value: string; onChange: (next: string) => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("hex");
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const label = name.replace(/([A-Z])/g, " $1").replace(/^(.)/, (c) => c.toUpperCase());
  const valid = colord(value);
  const rgb = valid.toRgb();
  const hsl = valid.toHsl();
  const set = (candidate: string) => {
    if (!colord(candidate).isValid()) return;
    const normalized = colord(candidate).toHex().toUpperCase();
    if (normalized === value.toUpperCase()) return;
    setRecent((existing) => [value.toUpperCase(), ...existing.filter((item) => item !== value.toUpperCase())].slice(0, 8));
    onChange(normalized);
  };
  const channel = (key: Channel, valueNext: number) => {
    if (!Number.isFinite(valueNext)) return;
    if (key === "r" || key === "g" || key === "b") {
      set(colord({ ...rgb, [key]: Math.max(0,Math.min(255,Math.round(valueNext))) }).toHex());
    } else {
      const max = key === "h" ? 360 : 100;
      set(colord({ ...hsl, [key]: Math.max(0,Math.min(max,Math.round(valueNext))) }).toHex());
    }
  };
  const eyedropper = async () => {
    const available = (window as unknown as {
      EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
    }).EyeDropper;
    if (!available) return;
    try { const picked = await new available().open(); set(picked.sRGBHex); }
    catch { /* Cancel is not an error. */ }
  };
  const input = (key: Channel, val: number) => (
    <label key={key} className="color-channel"><span>{key.toUpperCase()}</span>
      <input type="number" min="0" max={key === "h" ? 360 : key === "s" || key === "l" ? 100 : 255}
        value={Math.round(val)} aria-label={key.toUpperCase()} onChange={(e) => channel(key, Number(e.target.value))} />
    </label>
  );
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="token-color-trigger" aria-label={t("Edit {{name}} color", { name: label })}>
          <span className="token-color-preview" style={{ background: value }} />
          <span>{t(label)}</span><code>{value.toUpperCase()}</code>
          <AnimatedIcon name="down" size={13} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="accent-popover token-popover color-editor" sideOffset={8} align="end" collisionPadding={12}>
          <header className="color-editor-heading"><strong>{t(label)}</strong><span>{value.toUpperCase()}</span></header>
          <div className="color-editor-preview" style={{ background: value }} />
          {mode === "hsl"
            ? <HslColorPicker color={hsl} onChange={(hslValue) => set(colord(hslValue).toHex())} />
            : <HexColorPicker color={value} onChange={set} />}
          <div className="color-editor-tabs" role="group" aria-label="Color format">
            {(["hex","rgb","hsl"] as const).map((choice) => (
              <button key={choice} type="button" aria-pressed={mode === choice}
                className={mode === choice ? "active" : ""} onClick={() => setMode(choice)}>{choice.toUpperCase()}</button>
            ))}
          </div>
          {mode === "hex"
            ? <HexColorInput color={value} onChange={set} prefixed className="accent-hex-input" aria-label="HEX" />
            : <div className="color-channels">{mode === "rgb"
                ? (["r","g","b"] as const).map((key) => input(key,rgb[key]))
                : (["h","s","l"] as const).map((key) => input(key,hsl[key]))}</div>}
          <div className="color-palette-presets">
            {SWATCHES.map((swatch) => <button key={swatch} type="button" title={swatch}
              aria-label={swatch} style={{ background: swatch }} onClick={() => set(swatch)} />)}
          </div>
          {recent.length > 0 && <div className="color-editor-recent"><small>Recent</small>
            <div className="color-palette-presets">{recent.map((swatch) =>
              <button key={swatch} type="button" title={swatch} aria-label={swatch}
                style={{ background: swatch }} onClick={() => set(swatch)} />)}</div></div>}
          <footer className="color-editor-actions">
            <button type="button" onClick={() => void navigator.clipboard?.writeText(value.toUpperCase())}>Copy HEX</button>
            {"EyeDropper" in window && <button type="button" onClick={() => void eyedropper()}>Pick from screen</button>}
            <button type="button" onClick={() => setOpen(false)}>Done</button>
          </footer>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
