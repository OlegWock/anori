import type { Palette, ScaleName } from "@anori/design-system/color-engine";

const SCALE_ORDER: ScaleName[] = ["neutral", "surface", "accent", "danger", "warning", "success", "info"];

export function PrimitiveScales({ palette }: { palette: Palette }) {
  return (
    <div>
      <h2 className="ks-section-title">Primitive scales</h2>
      <div className="ks-scales">
        <div className="ks-scale-row">
          <div className="ks-scale-label" />
          <div className="ks-scale-nums">
            {palette.scales.neutral.map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length scale
              <div className="ks-step-num" key={i}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        {SCALE_ORDER.map((name) => (
          <div className="ks-scale-row" key={name}>
            <div className="ks-scale-label">{name}</div>
            <div className="ks-scale-steps">
              {palette.scales[name].map((color, i) => (
                <div
                  className="ks-step"
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length ramp
                  key={i}
                  style={{ background: color }}
                  title={`${name} ${i} — ${color}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SemanticTokens({ palette }: { palette: Palette }) {
  return (
    <div>
      <h2 className="ks-section-title">Semantic tokens</h2>
      <div className="ks-tokens">
        {Object.entries(palette.tokens).map(([name, color]) => (
          <div className="ks-token" key={name}>
            <div className="ks-token-swatch" style={{ background: color }} />
            <div className="ks-token-name">{name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
