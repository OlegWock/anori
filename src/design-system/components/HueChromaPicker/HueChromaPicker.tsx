import {
  accentLToBandPosition,
  bandPositionToAccentL,
  clampAccentL,
  type Gamut,
  type Mode,
  type OklchInput,
  surfaceColorForLightness,
} from "@anori/design-system/color-engine";
import { Input } from "@anori/design-system/components/Input/Input";
import { clampChroma, formatHex, toOklch, toP3, toRgb } from "@anori/utils/color";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";

const C_MAX = 0.37;
const RENDER_L = 0.72; // lightness the hue×chroma map is previewed at
const FIELD_W = 160;
const FIELD_H = 72;
const STRIP_W = 160;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const picker = css({ display: "flex", flexDirection: "column", gap: "1" });
const pickerLabel = css({ display: "flex", alignItems: "center", gap: "1" });
const pickerBody = css({ display: "flex", flexDirection: "column", gap: "2" });
const field = css({
  position: "relative",
  width: "100%",
  height: "9rem",
  borderRadius: "md",
  overflow: "hidden",
  cursor: "crosshair",
  touchAction: "none",
});
const strip = css({
  position: "relative",
  width: "100%",
  height: "2rem",
  borderRadius: "md",
  overflow: "hidden",
  cursor: "crosshair",
  touchAction: "none",
});
const fieldCanvas = css({ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" });
const handle = css({
  position: "absolute",
  width: "14px",
  height: "14px",
  borderRadius: "full",
  border: "2px solid #fff",
  boxShadow: "0 0 0 1px rgb(0 0 0 / 0.5)",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
});

// P3 displays render OKLCH directly (no gamut loss); on sRGB we fall back to a hex code
const formatCode = (value: OklchInput, gamut: Gamut): string => {
  const clamped = clampChroma({ mode: "oklch", l: value.l, c: value.c, h: value.h }, "oklch", gamut);
  if (gamut === "p3") {
    return `oklch(${(clamped.l ?? value.l).toFixed(4)} ${(clamped.c ?? value.c).toFixed(4)} ${(clamped.h ?? value.h).toFixed(1)})`;
  }
  return formatHex(clamped) ?? "#000000";
};

function PickerCanvas({ gamut }: { gamut: Gamut }) {
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
    for (let y = 0; y < FIELD_H; y++) {
      const c = (1 - y / (FIELD_H - 1)) * C_MAX;
      for (let x = 0; x < FIELD_W; x++) {
        const h = (x / (FIELD_W - 1)) * 360;
        const clamped = clampChroma({ mode: "oklch", l: RENDER_L, c, h }, "oklch", gamut);
        const col = gamut === "p3" ? toP3(clamped) : toRgb(clamped);
        const i = (y * FIELD_W + x) * 4;
        data[i] = Math.round(clamp01(col.r ?? 0) * 255);
        data[i + 1] = Math.round(clamp01(col.g ?? 0) * 255);
        data[i + 2] = Math.round(clamp01(col.b ?? 0) * 255);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [gamut]);
  return <canvas ref={ref} className={fieldCanvas} />;
}

function StripCanvas({ value, mode, gamut }: { value: OklchInput; mode: Mode; gamut: Gamut }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = STRIP_W;
    canvas.height = 1;
    const space = gamut === "p3" ? "display-p3" : "srgb";
    const ctx = canvas.getContext("2d", { colorSpace: space }) ?? canvas.getContext("2d");
    if (!ctx) return;
    let img: ImageData;
    try {
      img = ctx.createImageData(STRIP_W, 1, { colorSpace: space });
    } catch {
      img = ctx.createImageData(STRIP_W, 1);
    }
    const data = img.data;
    for (let x = 0; x < STRIP_W; x++) {
      const color = surfaceColorForLightness(value, mode, x / (STRIP_W - 1), gamut);
      const col = gamut === "p3" ? toP3(color) : toRgb(color);
      const i = x * 4;
      data[i] = Math.round(clamp01(col?.r ?? 0) * 255);
      data[i + 1] = Math.round(clamp01(col?.g ?? 0) * 255);
      data[i + 2] = Math.round(clamp01(col?.b ?? 0) * 255);
      data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [value, mode, gamut]);
  return <canvas ref={ref} className={fieldCanvas} />;
}

function LightnessStrip({
  value,
  mode,
  gamut,
  onChange,
}: {
  value: OklchInput;
  mode: Mode;
  gamut: Gamut;
  onChange: (v: OklchInput) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const pick = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const t = clamp01((clientX - rect.left) / rect.width);
    onChange({ ...value, l: bandPositionToAccentL(t) });
  };

  return (
    <div
      ref={ref}
      className={strip}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) pick(e.clientX);
      }}
    >
      <StripCanvas value={value} mode={mode} gamut={gamut} />
      <div className={handle} style={{ left: `${accentLToBandPosition(value.l) * 100}%`, top: "50%" }} />
    </div>
  );
}

export function HueChromaPicker({
  label,
  value,
  mode,
  gamut,
  onChange,
}: {
  label?: ReactNode;
  value: OklchInput;
  mode: Mode;
  gamut: Gamut;
  onChange: (v: OklchInput) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(() => formatCode(value, gamut));

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-sync only when the resolved value changes
  useEffect(() => {
    setCode(formatCode(value, gamut));
  }, [value.l, value.c, value.h, gamut]);

  const pick = (clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01((clientY - rect.top) / rect.height);
    onChange({ ...value, h: x * 360, c: (1 - y) * C_MAX });
  };

  const commitCode = () => {
    const parsed = toOklch(code);
    if (parsed) onChange({ l: clampAccentL(parsed.l ?? value.l), c: parsed.c ?? 0, h: parsed.h ?? 0 });
    else setCode(formatCode(value, gamut));
  };

  return (
    <div className={picker}>
      {label != null && <span className={pickerLabel}>{label}</span>}
      <div className={pickerBody}>
        <div
          ref={ref}
          className={field}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) pick(e.clientX, e.clientY);
          }}
        >
          <PickerCanvas gamut={gamut} />
          <div
            className={handle}
            style={{ left: `${(value.h / 360) * 100}%`, top: `${(1 - value.c / C_MAX) * 100}%` }}
          />
        </div>

        <LightnessStrip value={value} mode={mode} gamut={gamut} onChange={onChange} />

        <Input
          value={code}
          onValueChange={setCode}
          onBlur={commitCode}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
