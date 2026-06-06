import { buildPalette, detectGamut, type OklchInput, tokensToCssVars } from "@anori/design-system/color-engine";
import { Card } from "@anori/design-system/components/Card/Card";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { HueChromaPicker } from "./components/HueChromaPicker";
import { OklchPicker } from "./components/OklchPicker";
import { PrimitiveScales, SemanticTokens } from "./components/Swatches";
import { builtinThemePresets } from "./lib/theme-migration";
import "./styles.scss";

const DEFAULT_BG: OklchInput = { l: 0.3, c: 0.05, h: 175 };
const DEFAULT_ACCENT: OklchInput = { l: 0.72, c: 0.17, h: 150 };

const serialize = (o: OklchInput) => `${o.l.toFixed(4)},${o.c.toFixed(4)},${o.h.toFixed(1)}`;

const parseColorParam = (raw: string | null, fallback: OklchInput): OklchInput => {
  if (!raw) return fallback;
  const [l, c, h] = raw.split(",").map(Number);
  if ([l, c, h].some((n) => Number.isNaN(n))) return fallback;
  return { l, c, h };
};

function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [background, setBackground] = useState(() => parseColorParam(params.get("bg"), DEFAULT_BG));
  const [accent, setAccent] = useState(() => parseColorParam(params.get("ac"), DEFAULT_ACCENT));
  const [bgImage, setBgImage] = useState(() => builtinThemePresets[0]?.image ?? "");
  const gamut = useMemo(() => detectGamut(), []);

  useEffect(() => {
    const p = new URLSearchParams();
    p.set("bg", serialize(background));
    p.set("ac", serialize(accent));
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, [background, accent]);

  const palette = useMemo(() => buildPalette(background, accent, gamut), [background, accent, gamut]);
  const cssVars = useMemo(() => tokensToCssVars(palette), [palette]);

  return (
    <div
      className="ks-page"
      style={{ ...cssVars, backgroundImage: bgImage ? `url("${bgImage}")` : undefined } as CSSProperties}
    >
      <div className="ks-surface">
        <div className="ks-themes">
          <div className="ks-theme-list">
            {builtinThemePresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="ks-theme-btn"
                onClick={() => {
                  setBackground(preset.background);
                  setAccent(preset.accent);
                  setBgImage(preset.image);
                }}
              >
                <span className="ks-theme-swatches">
                  <span
                    style={{
                      background: `oklch(${preset.background.l} ${preset.background.c} ${preset.background.h})`,
                    }}
                  />
                  <span style={{ background: `oklch(0.7 ${preset.accent.c} ${preset.accent.h})` }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
          <div className="ks-pills">
            <span className="ks-mode-pill">mode: {palette.mode}</span>
            <span className="ks-mode-pill">gamut: {gamut === "p3" ? "Display P3" : "sRGB"}</span>
          </div>
        </div>

        <div className="ks-main">
          <div className="ks-col">
            <HueChromaPicker label="Accent" value={accent} gamut={gamut} onChange={setAccent} />
          </div>
          <div className="ks-col">
            <OklchPicker label="Background" value={background} gamut={gamut} onChange={setBackground} />
          </div>
          <div className="ks-col ks-col-scales">
            <PrimitiveScales palette={palette} />
          </div>
        </div>

        <div>
          <h2 className="ks-section-title">Card component</h2>
          <div className="ks-cards">
            <Card padding="2" radius="sm">
              <div className="ks-card-title">Compact — padding 2, radius sm</div>
              <div className="ks-card-body">Tighter padding, smaller corners.</div>
            </Card>

            <Card padding="4" radius="lg">
              <div className="ks-card-title">Default — padding 4, radius lg</div>
              <div className="ks-card-body">
                A solid surface with a border. Subtle text is allowed here because the surface is opaque (unlike the
                frosted plate behind it).
              </div>
            </Card>

            <Card as="section" aria-label="Stats" padding="5" radius="lg">
              <div className="ks-card-stat">128</div>
              <div className="ks-card-body">items synced · padding 8, radius md</div>
            </Card>
          </div>
        </div>

        <SemanticTokens palette={palette} />
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
