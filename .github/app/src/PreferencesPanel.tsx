


import { useTranslation } from "react-i18next";
import { CanvasSelect } from "./components/ui/CanvasSelect";
import { AnimatedIcon } from "./components/AnimatedIcon";
import {
  COLOR_KEYS,
  COMPONENTS,
  STATUS_PARTS,
  POSITIONS,
  SCALES,
  useCanvasConfig,
  type CanvasPreferences,
} from "./config";
import KeyboardSettings from "./KeyboardSettings";
import ColorEditor from "./ColorEditor";

const readable = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^(.)/, (char) => char.toUpperCase());
function Choice({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="setting-row settings-choice">
      <span>{t(label)}</span>
      <CanvasSelect
        label={t(label)}
        value={value}
        options={values.map((option) => ({ value: option, label: t(readable(option)) }))}
        onValueChange={onChange}
        className="settings-choice-select"
      />
    </div>
  );
}
function NumberPreference({
  label,
  value,
  min,
  max,
  set,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  set: (value: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="setting-row settings-choice">
      <span>{t(label)}</span>
      <input
        className="settings-number"
        aria-label={t(label)}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) set(Math.max(min, Math.min(max, Math.round(next))));
        }}
      />
    </label>
  );
}
const dimensionScale = (value: number, dimension: "fontSize" | "iconSize" | "spacing") =>
  (Object.keys(SCALES) as Array<keyof typeof SCALES>).reduce(
    (closest, size) =>
      Math.abs(SCALES[size][dimension] - value) < Math.abs(SCALES[closest][dimension] - value)
        ? size
        : closest,
    "normal" as keyof typeof SCALES,
  );

export default function PreferencesPanel() {
  const { t, i18n } = useTranslation();
  const prefs = useCanvasConfig((state) => state.preferences);
  const setPreferences = useCanvasConfig((state) => state.setPreferences);
  const setScale = useCanvasConfig((state) => state.setScale);
  const setColor = useCanvasConfig((state) => state.setColor);
  const reset = useCanvasConfig((state) => state.resetPreferences);
  const patch = <K extends keyof CanvasPreferences>(key: K, value: CanvasPreferences[K]) =>
    setPreferences({ [key]: value } as Partial<CanvasPreferences>);
  const dark =
    prefs.theme === "dark" ||
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
        <Choice
          label="Color mode"
          value={prefs.theme}
          values={["dark", "light", "system"]}
          onChange={(value) => patch("theme", value as CanvasPreferences["theme"])}
        />
        <Choice
          label="Theme"
          value={prefs.skin}
          values={["oled", "graphite", "slate", "contrast"]}
          onChange={(value) => patch("skin", value as CanvasPreferences["skin"])}
        />
        <Choice
          label="Visual density"
          value={prefs.density}
          values={["comfortable", "compact"]}
          onChange={(value) => patch("density", value as CanvasPreferences["density"])}
        />
        <Choice
          label="UI scale"
          value={prefs.uiScale}
          values={Object.keys(SCALES)}
          onChange={(value) => setScale(value as keyof typeof SCALES)}
        />
        <fieldset className="settings-subgrid" aria-label={t("Individual scale values")}>
          {(["fontSize", "iconSize", "spacing"] as const).map((dimension) => (
            <Choice
              key={dimension}
              label={
                dimension === "fontSize"
                  ? "Text size"
                  : dimension === "iconSize"
                    ? "Icon size"
                    : "Spacing"
              }
              value={dimensionScale(prefs[dimension], dimension)}
              values={["small", "normal", "large"]}
              onChange={(value) =>
                patch(dimension, SCALES[value as keyof typeof SCALES][dimension])
              }
            />
          ))}
          <NumberPreference
            label="Border radius"
            value={prefs.radius}
            min={0}
            max={24}
            set={(value) => patch("radius", value)}
          />
        </fieldset>
        <h3>
          {t("Color tokens")} · {t(dark ? "Dark" : "Light")}
        </h3>
        <p className="muted">
          {t("Every UI color comes from the editable palette for the selected appearance.")}
        </p>
        <div className="token-grid">
          {COLOR_KEYS.map((key) => (
            <ColorEditor
              key={key}
              name={key}
              value={colors[key]}
              onChange={(value) => setColor(key, value, dark)}
            />
          ))}
        </div>
      </div>
      <div className="settings-group">
        <h2>{t("Preferences")}</h2>
        <Choice
          label="Navigation position"
          value={prefs.navigationPosition}
          values={POSITIONS.navigation}
          onChange={(value) =>
            patch("navigationPosition", value as CanvasPreferences["navigationPosition"])
          }
        />
        <Choice
          label="Omnibar position"
          value={prefs.omnibarPosition}
          values={POSITIONS.omnibar}
          onChange={(value) =>
            patch("omnibarPosition", value as CanvasPreferences["omnibarPosition"])
          }
        />
        <Choice
          label="Settings button position"
          value={prefs.settingsPosition}
          values={POSITIONS.settings}
          onChange={(value) =>
            patch("settingsPosition", value as CanvasPreferences["settingsPosition"])
          }
        />
        <Choice
          label="Primary sidebar position"
          value={prefs.sidebarPosition}
          values={POSITIONS.sidebar}
          onChange={(value) =>
            patch("sidebarPosition", value as CanvasPreferences["sidebarPosition"])
          }
        />
        <NumberPreference
          label="Title bar height"
          value={prefs.titleBarHeight}
          min={22}
          max={80}
          set={(value) => patch("titleBarHeight", value)}
        />
        <NumberPreference
          label="Status bar height"
          value={prefs.statusBarHeight}
          min={22}
          max={80}
          set={(value) => patch("statusBarHeight", value)}
        />
        <NumberPreference
          label="Primary sidebar width"
          value={prefs.sidebarWidth}
          min={180}
          max={480}
          set={(value) => patch("sidebarWidth", value)}
        />
        <Choice
          label="Activity bar position"
          value={prefs.activityBarPosition}
          values={POSITIONS.activity}
          onChange={(value) =>
            patch("activityBarPosition", value as CanvasPreferences["activityBarPosition"])
          }
        />
        <Choice
          label="Command results position"
          value={prefs.commandPlacement}
          values={["auto", "down", "up"]}
          onChange={(value) => patch("commandPlacement", value as CanvasPreferences["commandPlacement"])}
        />
        <label className="setting-row settings-choice">
          <span>{t("Blur background when command centre is open")}</span>
          <input type="checkbox" checked={prefs.commandBackdropBlur}
            onChange={(event) => patch("commandBackdropBlur", event.target.checked)} />
        </label>
        <h3>{t("Status bar alignment")}</h3>
        <p className="muted">{t("Items sharing an alignment are grouped with a separator.")}</p>
        {STATUS_PARTS.map((part) => <Choice key={part}
          label={readable(part)}
          value={prefs.statusAlignment[part]}
          values={["left", "center", "right"]}
          onChange={(value) => patch("statusAlignment", {
            ...prefs.statusAlignment, [part]: value,
          } as CanvasPreferences["statusAlignment"])}
        />)}
        <Choice
          label="Activity bar density"
          value={prefs.activityBarDensity}
          values={["compact", "comfortable"]}
          onChange={(value) =>
            patch("activityBarDensity", value as CanvasPreferences["activityBarDensity"])
          }
        />
      </div>
      <div className="settings-group">
        <h2>{t("Component token mapping")}</h2>
        <p className="muted">{t("Override a component's color and scale tokens without changing the global palette. Inherit keeps the global setting.")}</p>
        <div className="component-token-table" role="table" aria-label={t("Component token mapping")}>
          {COMPONENTS.map((component) => (
            <div className="component-token-row" key={component}>
              <strong>{t(readable(component))}</strong>
              {(["surface","text","border","accent","font","icon","spacing"] as const).map((field) => (
                <label key={field} className="component-token-cell">
                  <span>{t(readable(field))}</span>
                  <CanvasSelect
                    label={t(readable(component)) + " · " + t(readable(field))}
                    value={prefs.componentThemes[component][field]}
                    options={["inherit", ...(["surface","text","border","accent"].includes(field)
                      ? COLOR_KEYS : ["small","normal","large"])].map((option) => ({
                        value: option, label: t(readable(option)),
                      }))}
                    onValueChange={(value) => {
                      patch("componentThemes", {
                        ...prefs.componentThemes,
                        [component]: { ...prefs.componentThemes[component], [field]: value },
                      } as CanvasPreferences["componentThemes"]);
                    }}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="settings-group">
        <h2>{t("Language")}</h2>
        <Choice
          label="Interface language"
          value={language}
          values={["en", "cs", "es"]}
          onChange={(value) => {
            void i18n.changeLanguage(value);
          }}
        />
      </div>
      <KeyboardSettings />
      <div className="settings-group">
        <button type="button" className="canvas-button canvas-button-subtle" onClick={reset}>
          <AnimatedIcon name="reset" size={16} />
          {t("Reset appearance")}
        </button>
      </div>
    </div>
  );
}
