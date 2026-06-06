import { clampChroma, converter, formatCss } from "culori";
import { useEffect, useRef } from "react";
import type { Gamut, OklchInput } from "../lib/color-engine";

const C_MAX = 0.37;
const RENDER_L = 0.72; // lightness the hue×chroma map is previewed at (accent lightness is derived)
const FIELD_W = 160;
const FIELD_H = 72;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Static hue (x) × chroma (y) map at a fixed lightness — doesn't depend on the picked value, only
// on the gamut. Top = vivid, bottom = muted/gray; left→right = hue.
function Field({ gamut }: { gamut: Gamut }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = FIELD_W;
    canvas.height = FIELD_H;
    const space = gamut === "p3" ? "display-p3" : "srgb";
    const ctx = canvas.getContext("2d", { colorSpace: space }) ?? canvas.getContext("2d");
    if (!ctx) return;
    let img: ImageData;
    try {
      img = ctx.createImageData(FIELD_W, FIELD_H, { colorSpace: space });
    } catch {
      img = ctx.createImageData(FIELD_W, FIELD_H);
    }
    const data = img.data;
    const convert = converter(gamut === "p3" ? "p3" : "rgb");
    for (let y = 0; y < FIELD_H; y++) {
      const c = (1 - y / (FIELD_H - 1)) * C_MAX;
      for (let x = 0; x < FIELD_W; x++) {
        const h = (x / (FIELD_W - 1)) * 360;
        const col = convert(clampChroma({ mode: "oklch", l: RENDER_L, c, h }, "oklch", gamut));
        const i = (y * FIELD_W + x) * 4;
        data[i] = Math.round(clamp01(col.r ?? 0) * 255);
        data[i + 1] = Math.round(clamp01(col.g ?? 0) * 255);
        data[i + 2] = Math.round(clamp01(col.b ?? 0) * 255);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [gamut]);
  return <canvas ref={ref} className="ks-area-canvas" />;
}

export function HueChromaPicker({
  label,
  value,
  gamut,
  onChange,
}: {
  label: string;
  value: OklchInput;
  gamut: Gamut;
  onChange: (v: OklchInput) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01((clientY - rect.top) / rect.height);
    onChange({ ...value, h: x * 360, c: (1 - y) * C_MAX });
  };
  const preview =
    formatCss(clampChroma({ mode: "oklch", l: RENDER_L, c: value.c, h: value.h }, "oklch", gamut)) ??
    `oklch(${RENDER_L} ${value.c} ${value.h})`;

  return (
    <div className="ks-picker">
      <div className="ks-picker-head">
        <span className="ks-picker-swatch" style={{ background: preview }} />
        <span className="ks-picker-name">{label}</span>
        <span className="ks-picker-val">
          C {value.c.toFixed(3)} · H {String(Math.round(value.h)).padStart(3, "0")}
        </span>
      </div>
      <div
        ref={ref}
        className="ks-area"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) pick(e.clientX, e.clientY);
        }}
      >
        <Field gamut={gamut} />
        <div
          className="ks-area-handle"
          style={{ left: `${(value.h / 360) * 100}%`, top: `${(1 - value.c / C_MAX) * 100}%` }}
        />
      </div>
    </div>
  );
}
