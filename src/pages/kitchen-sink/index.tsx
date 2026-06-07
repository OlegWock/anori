import {
  buildPalette,
  detectGamut,
  type Mode,
  type OklchInput,
  tokensToCssVars,
} from "@anori/design-system/color-engine";
import { Button } from "@anori/design-system/components/Button/Button";
import { Card } from "@anori/design-system/components/Card/Card";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { HueChromaPicker } from "./components/HueChromaPicker";
import { PrimitiveScales, SemanticTokens } from "./components/Swatches";
import { builtinThemePresets } from "./lib/theme-migration";
import "../../panda.css";
import "./styles.scss";

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
  const [accent, setAccent] = useState(() => parseColorParam(params.get("ac"), DEFAULT_ACCENT));
  const [mode, setMode] = useState<Mode>(() => (params.get("mode") === "light" ? "light" : "dark"));
  const [bgImage, setBgImage] = useState(() => params.get("img") ?? builtinThemePresets[0]?.image ?? "");
  const [compact, setCompact] = useState(false);
  const gamut = useMemo(() => detectGamut(), []);

  useEffect(() => {
    const p = new URLSearchParams();
    p.set("ac", serialize(accent));
    p.set("mode", mode);
    if (bgImage) p.set("img", bgImage);
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, [accent, mode, bgImage]);

  const palette = useMemo(() => buildPalette(accent, mode, gamut), [accent, mode, gamut]);
  const cssVars = useMemo(() => tokensToCssVars(palette), [palette]);

  // Apply the tokens at :root (like the real app does), not on .ks-page. Panda's semantic token vars
  // (--dsp-colors-*: var(--ds-*)) are declared at :root and resolve their var(--ds-*) against :root,
  // so the values must live there or Panda-mediated styles won't pick up theme changes.
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(cssVars)) root.style.setProperty(key, value);
  }, [cssVars]);

  return (
    <div className="ks-page" style={{ backgroundImage: bgImage ? `url("${bgImage}")` : undefined }}>
      <div className={`ks-surface${compact ? " compact-mode-active" : ""}`}>
        <div className="ks-themes">
          <div className="ks-theme-list">
            {builtinThemePresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="ks-theme-btn"
                onClick={() => {
                  setAccent(preset.accent);
                  setMode(preset.mode);
                  setBgImage(preset.image);
                }}
              >
                <span className="ks-theme-swatches">
                  <span style={{ background: `oklch(0.7 ${preset.accent.c} ${preset.accent.h})` }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
          <div className="ks-pills">
            <label className="ks-mode-pill">
              <input
                type="checkbox"
                checked={mode === "light"}
                onChange={(e) => setMode(e.target.checked ? "light" : "dark")}
              />{" "}
              light
            </label>
            <span className="ks-mode-pill">gamut: {gamut === "p3" ? "Display P3" : "sRGB"}</span>
            <label className="ks-mode-pill">
              <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> compact
            </label>
          </div>
        </div>

        <div className="ks-main">
          <div className="ks-col">
            <HueChromaPicker label="Accent" value={accent} gamut={gamut} onChange={setAccent} />
          </div>
          <div className="ks-col ks-col-scales">
            <PrimitiveScales palette={palette} />
          </div>
        </div>

        <div>
          <h2 className="ks-section-title">Card component</h2>
          <div className="ks-cards">
            <Card w="16rem" padding="2" borderRadius="sm">
              <div className="ks-card-title">Compact — padding 2, radius sm</div>
              <div className="ks-card-body">Tighter padding, smaller corners.</div>
            </Card>

            <Card w="16rem" padding="4" borderRadius="lg">
              <div className="ks-card-title">Default — padding 4, radius lg</div>
              <div className="ks-card-body">
                A solid surface with a border. Subtle text is allowed here because the surface is opaque (unlike the
                frosted plate behind it).
              </div>
            </Card>

            <Card as="section" aria-label="Stats" w="16rem" padding="5" borderRadius="lg">
              <div className="ks-card-stat">128</div>
              <div className="ks-card-body">items synced · padding 5, radius lg</div>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="ks-section-title">Button component</h2>
          <div className="ks-row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="frosted">Frosted</Button>
            <Button size="compact">Primary compact</Button>
            <Button variant="secondary" size="compact">
              Secondary compact
            </Button>
            <Button variant="frosted" size="compact">
              Frosted compact
            </Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>
              Secondary disabled
            </Button>
            <Button variant="frosted" disabled>
              Frosted disabled
            </Button>
          </div>
          <Card mt="6">
            <div className="ks-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="frosted">Frosted</Button>
              <Button size="compact">Primary compact</Button>
              <Button variant="secondary" size="compact">
                Secondary compact
              </Button>
              <Button variant="frosted" size="compact">
                Frosted compact
              </Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                Secondary disabled
              </Button>
              <Button variant="frosted" disabled>
                Frosted disabled
              </Button>
            </div>
          </Card>
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
