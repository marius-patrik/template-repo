import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { useTranslation } from "react-i18next";
import { CanvasSelect } from "./components/ui/CanvasSelect";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { COLOR_KEYS, POSITIONS, SCALES, useCanvasConfig, type ColorKey, type CanvasPreferences } from "./config";
import KeyboardSettings from "./KeyboardSettings";

const readable = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^(.)/, (char) => char.toUpperCase());
function TokenColor({ name, value, onChange }: {
  name: ColorKey; value: string; onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="token-color-trigger" aria-label={t("Edit {{name}} color", { name: readable(name) })}>
          <span className="token-color-preview" style={{ background: value }} />
          <span>{t(readable(name))}</span>
          <code>{value.toUpperCase()}</code>
          <AnimatedIcon name="down" size={13} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="accent-popover token-popover" sideOffset={8} align="end" collisionPadding={12}>
          <strong>{t(readable(name))}</strong>
          <HexColorPicker color={value} onChange={onChange} />
          <HexColorInput color={value} onChange={onChange} prefixed className="accent-hex-input" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
function Choice({ label, value, values, onChange }: {
  label: string; value: string; values: readonly string[]; onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="setting-row settings-choice">
      <span>{t(label)}</span>
      <CanvasSelect label={t(label)} value={value}
        options={values.map((option) => ({ value: option, label: t(readable(option)) }))}
        onValueChange={onChange} className="settings-choice-select" />
    </label>
  );
}
function NumberPreference({ label, value, min, max, set }: {
  label: string; value: number; min: number; max: number; set: (value: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="setting-row settings-choice">
      <span>{t(label)}</span>
      <input className="settings-number" aria-label={t(label)} type="number"
        min={min} max={max} step={1} value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) set(Math.max(min, Math.min(max, Math.round(next))));
        }} />
    </label>
  );
}
export default function PreferencesPanel() {
  const { t, i18n } = useTranslation();
  const prefs = useCanvasConfig((state) => state.preferences);
  const setPreferences = useCanvasConfig((state) => state.setPreferences);
  const setScale = useCanvasConfig((state) => state.setScale);
  const setColor = useCanvasConfig((state) => state.setColor);
  const reset = useCanvasConfig((state) => state.resetPreferences);
  const patch = <K extends keyof CanvasPreferences>(key: K, value: CanvasPreferences[K]) =>
    setPreferences({ [key]: value } as Partial<CanvasPreferences>);
  const dark = prefs.theme === "dark" ||
    (prefs.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const colors = dark ? prefs.darkColors : prefs.lightColors;
  const language = i18n.resolvedLanguage?.split("-")[0] ?? "en";
  return (
    <div className="page settings-page" data-testid="settings-page">
      <header className="page-intro">
        <p className="eyebrow">{t("Preferences")}</p>
        <h1>{t("Settings")}</h1>
        <p className="muted">{t("Changes are stored in this browser only.")}</p>
      </header>
      <div className="settings-group">
        <h2>{t("Appearance")}</h2>
        <Choice label="Theme" value={prefs.theme} values={["dark", "light", "system"]}
          onChange={(value) => patch("theme", value as CanvasPreferences["theme"])} />
        <Choice label="Skin" value={prefs.skin} values={["graphite", "slate", "contrast"]}
          onChange={(value) => patch("skin", value as CanvasPreferences["skin"])} />
        <Choice label="Visual density" value={prefs.density} values={["comfortable", "compact"]}
          onChange={(value) => patch("density", value as CanvasPreferences["density"])} />
        <Choice label="UI scale" value={prefs.uiScale} values={Object.keys(SCALES)}
          onChange={(value) => setScale(value as keyof typeof SCALES)} />
        <div className="settings-subgrid" aria-label={t("Individual scale values")}>
          <NumberPreference label="Text size" value={prefs.fontSize} min={10} max={26}
            set={(value) => patch("fontSize", value)} />
          <NumberPreference label="Icon size" value={prefs.iconSize} min={12} max={32}
            set={(value) => patch("iconSize", value)} />
          <NumberPreference label="Border radius" value={prefs.radius} min={0} max={24}
            set={(value) => patch("radius", value)} />
          <NumberPreference label="Spacing" value={prefs.spacing} min={2} max={20}
            set={(value) => patch("spacing", value)} />
        </div>
        <h3>{t("Color tokens")} · {t(dark ? "Dark" : "Light")}</h3>
        <p className="muted">{t("Every UI color comes from the editable palette for the selected appearance.")}</p>
        <div className="token-grid">
          {COLOR_KEYS.map((key) => <TokenColor key={key} name={key} value={colors[key]}
            onChange={(value) => setColor(key, value, dark)} />)}
        </div>
      </div>
      <div className="settings-group">
        <h2>{t("Layout and surfaces")}</h2>
        <Choice label="Navigation position" value={prefs.navigationPosition} values={POSITIONS.navigation}
          onChange={(value) => patch("navigationPosition", value as CanvasPreferences["navigationPosition"])} />
        <Choice label="Omnibar position" value={prefs.omnibarPosition} values={POSITIONS.omnibar}
          onChange={(value) => patch("omnibarPosition", value as CanvasPreferences["omnibarPosition"])} />
        <Choice label="Settings position" value={prefs.settingsPosition} values={POSITIONS.settings}
          onChange={(value) => patch("settingsPosition", value as CanvasPreferences["settingsPosition"])} />
        <Choice label="Primary sidebar position" value={prefs.sidebarPosition} values={POSITIONS.sidebar}
          onChange={(value) => patch("sidebarPosition", value as CanvasPreferences["sidebarPosition"])} />
        <NumberPreference label="Primary sidebar width" value={prefs.sidebarWidth} min={180} max={480}
          set={(value) => patch("sidebarWidth", value)} />
        <Choice label="Activity bar position" value={prefs.activityBarPosition} values={POSITIONS.activity}
          onChange={(value) => patch("activityBarPosition", value as CanvasPreferences["activityBarPosition"])} />
        <Choice label="Activity bar density" value={prefs.activityBarDensity} values={["compact", "comfortable"]}
          onChange={(value) => patch("activityBarDensity", value as CanvasPreferences["activityBarDensity"])} />
      </div>
      <div className="settings-group">
        <h2>{t("Language")}</h2>
        <Choice label="Interface language" value={language} values={["en", "cs", "es"]}
          onChange={(value) => { void i18n.changeLanguage(value); }} />
      </div>
      <KeyboardSettings />
      <div className="settings-group">
        <button type="button" className="canvas-button canvas-button-subtle"
          onClick={reset}><AnimatedIcon name="reset" size={16} />{t("Reset appearance")}</button>
      </div>
    </div>
  );
}
