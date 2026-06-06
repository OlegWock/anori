import { clampChroma, converter, formatCss } from "culori";
import { useEffect, useRef } from "react";
import type { Gamut, OklchInput } from "../lib/color-engine";

const C_MAX = 0.37; // reaches into the Display-P3 gamut; clamped to the supported gamut
const FIELD_W = 100;
const FIELD_H = 72;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Chroma (x) × lightness (y) field for a fixed hue, drawn on a canvas so each pixel is the exact
// gamut-clamped OKLCH color — CSS gradients interpolate hue and gamut-map unpredictably.
function Field({ hue, gamut }: { hue: number; gamut: Gamut }) {
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
    const toGamut = converter(gamut === "p3" ? "p3" : "rgb");

    for (let y = 0; y < FIELD_H; y++) {
      const l = 1 - y / (FIELD_H - 1);
      for (let x = 0; x < FIELD_W; x++) {
        const c = (x / (FIELD_W - 1)) * C_MAX;
        const col = toGamut(clampChroma({ mode: "oklch", l, c, h: hue }, "oklch", gamut));
        const i = (y * FIELD_W + x) * 4;
        data[i] = Math.round(clamp01(col.r ?? 0) * 255);
        data[i + 1] = Math.round(clamp01(col.g ?? 0) * 255);
        data[i + 2] = Math.round(clamp01(col.b ?? 0) * 255);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [hue, gamut]);

  return <canvas ref={ref} className="ks-area-canvas" />;
}

function Area({ value, gamut, onChange }: { value: OklchInput; gamut: Gamut; onChange: (v: OklchInput) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01((clientY - rect.top) / rect.height);
    onChange({ ...value, c: x * C_MAX, l: 1 - y });
  };
  return (
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
      <Field hue={value.h} gamut={gamut} />
      <div className="ks-area-handle" style={{ left: `${(value.c / C_MAX) * 100}%`, top: `${(1 - value.l) * 100}%` }} />
    </div>
  );
}

function HueStrip({ value, onChange }: { value: OklchInput; onChange: (v: OklchInput) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onChange({ ...value, h: clamp01((clientX - rect.left) / rect.width) * 360 });
  };
  return (
    <div
      ref={ref}
      className="ks-hue"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) pick(e.clientX);
      }}
    >
      <div className="ks-hue-handle" style={{ left: `${(value.h / 360) * 100}%` }} />
    </div>
  );
}

export function OklchPicker({
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
  // Clamp the preview to the same gamut as the engine so it matches the applied color
  // (a raw out-of-gamut oklch() is gamut-mapped differently by the browser than by culori).
  const preview =
    formatCss(clampChroma({ mode: "oklch", l: value.l, c: value.c, h: value.h }, "oklch", gamut)) ??
    `oklch(${value.l} ${value.c} ${value.h})`;
  return (
    <div className="ks-picker">
      <div className="ks-picker-head">
        <span className="ks-picker-swatch" style={{ background: preview }} />
        <span className="ks-picker-name">{label}</span>
        <span className="ks-picker-val">
          L {value.l.toFixed(2)} · C {value.c.toFixed(3)} · H {String(Math.round(value.h)).padStart(3, "0")}
        </span>
      </div>
      <Area value={value} gamut={gamut} onChange={onChange} />
      <HueStrip value={value} onChange={onChange} />
    </div>
  );
}
