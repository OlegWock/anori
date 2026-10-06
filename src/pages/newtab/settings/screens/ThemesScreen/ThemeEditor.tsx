import { detectGamut, type Mode } from "@anori/design-system/color-engine";
import { Button as DSButton } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { Hint } from "@anori/design-system/components/Hint/Hint";
import { HueChromaPicker } from "@anori/design-system/components/HueChromaPicker/HueChromaPicker";
import { Select } from "@anori/design-system/components/Select/Select";
import { Slider } from "@anori/design-system/components/Slider/Slider";
import { assertValue } from "@anori/utils/asserts";
import { showOpenFilePicker } from "@anori/utils/files";
import { useMirrorStateToRef, useRunAfterNextRender } from "@anori/utils/hooks";
import { guid } from "@anori/utils/misc";
import { setPageBackground } from "@anori/utils/page";
import { anoriSchema, type CustomTheme, getAnoriStorage } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import {
  applyTheme,
  applyThemeColors,
  applyThemeDecorations,
  getThemeBackground,
  getThemeBackgroundOriginal,
  type PartialCustomTheme,
  resolveColorScheme,
  saveThemeBackground,
} from "@anori/utils/user-data/theme";
import { useCurrentTheme } from "@anori/utils/user-data/theme-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const PREVIEW_MODES: Mode[] = ["light", "dark"];
const PREVIEW_MODE_LABEL_KEY: Record<Mode, string> = {
  light: "settings.theme.colorSchemeLight",
  dark: "settings.theme.colorSchemeDark",
};

const editorPanel = css({ display: "flex", flexDirection: "column", gap: "4" });
const preview = css({
  position: "relative",
  overflow: "hidden",
  height: "160px",
  borderRadius: "md",
  // Tiny checkerboard placeholder, shown until an image is selected.
  background: "repeating-conic-gradient(var(--ds-frosted-strong) 0% 25%, transparent 0% 50%) 50% / 18px 18px",
});

const previewImage = css({ position: "absolute", backgroundSize: "cover", backgroundPosition: "center" });
const backgroundSection = css({ display: "flex", flexDirection: "column", gap: "2" });
const editorActions = css({ display: "flex", justifyContent: "flex-end", gap: "3" });

const captureStillFrame = async (image: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  assertValue(ctx, "couldn't get 2D context from canvas");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("couldn't export still frame"))), "image/png");
  });
};

export const ThemeEditor = ({ theme: themeFromProps, onClose }: { theme?: CustomTheme; onClose: VoidFunction }) => {
  const loadBackground = async () => {
    const files = await showOpenFilePicker(false, ".jpg,.jpeg,.png,.gif");
    if (!files[0]) return;
    const background = files[0];
    backgroundPickedRef.current = true;
    setOriginalBackground(background);
    applyBlur(theme.blur);
  };

  const applyBlur = useCallback((blur: number) => {
    if (!originalBackgroundBlob.current) return;
    const bgUrl = URL.createObjectURL(originalBackgroundBlob.current);
    if (blur === 0) {
      blurredBackgroundBlob.current = originalBackgroundBlob.current;
      setBackgroundUrl(bgUrl);
      setPageBackground(bgUrl);
      return;
    }
    const img = new Image();
    img.src = bgUrl;
    img.onload = () => {
      const PADDING = blur * 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.width + PADDING * 2;
      canvas.height = img.height + PADDING * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error(`couldn't get 2D context from canvas`);
      }
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = img.width;
      croppedCanvas.height = img.height;
      const croppedCtx = croppedCanvas.getContext("2d");
      if (!croppedCtx) {
        throw new Error(`couldn't get 2D context from canvas`);
      }
      croppedCtx.drawImage(canvas, PADDING, PADDING, img.width, img.height, 0, 0, img.width, img.height);

      croppedCanvas.toBlob((blob) => {
        if (!blob) return;
        blurredBackgroundBlob.current = blob;
        const url = URL.createObjectURL(blurredBackgroundBlob.current);
        setBackgroundUrl(url);
        setPageBackground(url);
        URL.revokeObjectURL(bgUrl);
      }, "image/png");
    };
  }, []);

  const applyPreview = (accent = theme.accent) => {
    runAfterRender(() => applyThemeColors(accent, previewMode));
  };

  const saveTheme = async () => {
    const id = theme.name;
    const hasBlobs = !!originalBackgroundBlob.current && !!blurredBackgroundBlob.current;
    if (!themeFromProps && !hasBlobs) return;

    const backgroundChanged = !themeFromProps || backgroundPickedRef.current;
    const blurChanged = themeFromProps != null && theme.blur !== themeFromProps.blur;
    if (backgroundChanged && originalBackgroundBlob.current && blurredBackgroundBlob.current) {
      await saveThemeBackground(id, "original", originalBackgroundBlob.current);
      await saveThemeBackground(id, "blurred", blurredBackgroundBlob.current);
    } else if (blurChanged && blurredBackgroundBlob.current) {
      await saveThemeBackground(id, "blurred", blurredBackgroundBlob.current);
    }

    const toSave: CustomTheme = {
      name: theme.name,
      type: "custom",
      blur: theme.blur,
      accent: theme.accent,
      hideDotPattern: theme.hideDotPattern,
      pixelatedBackground: theme.pixelatedBackground,
    };
    const storage = await getAnoriStorage();
    let customThemes = storage.get(anoriSchema.customThemes);
    if (themeFromProps) {
      customThemes = customThemes.map((t) => (t.name === id ? toSave : t));
    } else {
      customThemes.push(toSave);
    }
    await storage.set(anoriSchema.customThemes, customThemes);
    savedRef.current = true;
    setCurrentTheme(theme.name);
    applyThemeColors(theme.accent, resolveColorScheme(colorScheme));
    applyThemeDecorations(toSave);
    onClose();
  };

  const [colorScheme] = useStorageValue(anoriSchema.colorScheme);
  const [previewMode, setPreviewMode] = useState<Mode>(() => resolveColorScheme(colorScheme));
  const previewModeRef = useMirrorStateToRef(previewMode);
  const [currentTheme, setCurrentTheme] = useCurrentTheme();
  const currentThemeRef = useMirrorStateToRef(currentTheme);
  const colorSchemeRef = useMirrorStateToRef(colorScheme);
  const savedRef = useRef(false);
  const gamut = useMemo(() => detectGamut(), []);

  // The editor previews colors/background by mutating CSS variables and the page background directly.
  // Restore the user's actual theme whenever the editor is left without saving.
  useEffect(() => {
    return () => {
      if (!savedRef.current) applyTheme(currentThemeRef.current, resolveColorScheme(colorSchemeRef.current));
    };
  }, []);

  const [theme, setTheme] = useState<PartialCustomTheme>(() => {
    if (themeFromProps) return themeFromProps;
    return {
      name: guid(),
      type: "custom",
      blur: 5,
      accent: currentTheme.accent,
    };
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: load + bake once per theme; later blur changes bake via the slider's onCommit, not every drag
  useEffect(() => {
    const main = async () => {
      try {
        const original = await getThemeBackgroundOriginal(theme.name);
        const blurred = await getThemeBackground(theme.name);
        blurredBackgroundBlob.current = blurred;
        setOriginalBackground(original);
        applyBlur(theme.blur);
      } catch (err) {
        console.log("Error while trying to load background", err);
      }
    };

    main();
  }, [applyBlur, theme.name]);

  const { t } = useTranslation();
  const originalBackgroundBlob = useRef<Blob | null>(null);
  const blurredBackgroundBlob = useRef<Blob | null>(null);
  const backgroundPickedRef = useRef(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => (backgroundUrl ? URL.revokeObjectURL(backgroundUrl) : undefined);
  }, [backgroundUrl]);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => (originalUrl ? URL.revokeObjectURL(originalUrl) : undefined);
  }, [originalUrl]);
  const [stillFrameUrl, setStillFrameUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => (stillFrameUrl ? URL.revokeObjectURL(stillFrameUrl) : undefined);
  }, [stillFrameUrl]);

  const setOriginalBackground = (background: Blob) => {
    originalBackgroundBlob.current = background;
    setOriginalUrl(URL.createObjectURL(background));
    setStillFrameUrl(null);
    captureStillFrame(background)
      .then((frame) => setStillFrameUrl(URL.createObjectURL(frame)))
      .catch((err) => console.log("Error while capturing still frame of background", err));
  };

  // The preview box is far smaller than the full-screen background, so the same px blur reads much
  // stronger here than the baked image does behind the page. Scale the live CSS blur by the box's
  // width relative to the viewport (both cover) so the preview approximates the real background.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setPreviewScale(el.clientWidth / window.innerWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const accentRef = useMirrorStateToRef(theme.accent);
  const backgroundUrlRef = useMirrorStateToRef(backgroundUrl);
  // Flipping the color scheme makes the global theme watcher re-apply the *active* theme; re-assert
  // the editor's draft preview so the in-progress accent (and background) isn't lost. Refs keep this
  // tied to scheme changes only.
  // biome-ignore lint/correctness/useExhaustiveDependencies: colorScheme is the trigger, not a read value — everything is read via refs so this fires on scheme changes only
  useEffect(() => {
    applyThemeColors(accentRef.current, previewModeRef.current);
    if (backgroundUrlRef.current) setPageBackground(backgroundUrlRef.current);
  }, [colorScheme]);

  const runAfterRender = useRunAfterNextRender();
  const previewBlur = theme.blur * previewScale;

  return (
    <div className={editorPanel}>
      <Heading level={3}>{themeFromProps ? t("settings.theme.editTheme") : t("settings.theme.newTheme")}</Heading>

      <Field label={t("settings.theme.previewColorScheme")}>
        <Select<Mode>
          options={PREVIEW_MODES}
          value={previewMode}
          onChange={(mode) => {
            setPreviewMode(mode);
            applyThemeColors(theme.accent, mode);
          }}
          getOptionKey={(m) => m}
          getOptionLabel={(m) => t(PREVIEW_MODE_LABEL_KEY[m])}
        />
      </Field>

      <Field label={t("settings.theme.colorBackground")}>
        <div className={backgroundSection}>
          <div ref={previewRef} className={preview}>
            {originalUrl && (
              <div
                className={previewImage}
                style={{
                  inset: `-${previewBlur * 2}px`,
                  backgroundImage: `url(${theme.blur > 0 && stillFrameUrl ? stillFrameUrl : originalUrl})`,
                  filter: `blur(${previewBlur}px)`,
                  imageRendering: theme.pixelatedBackground ? "pixelated" : undefined,
                }}
              />
            )}
          </div>

          <DSButton variant="secondary" onClick={loadBackground}>
            {backgroundUrl ? t("settings.theme.changeBackground") : t("settings.theme.selectBackground")}
          </DSButton>
        </div>
      </Field>

      <Field label={t("settings.theme.blur")}>
        <Slider
          value={theme.blur}
          min={0}
          max={50}
          onChange={(val) => setTheme((p) => ({ ...p, blur: val }))}
          onCommit={(val) => applyBlur(val)}
        />
      </Field>

      <HueChromaPicker
        label={t("settings.theme.colorAccent")}
        value={theme.accent}
        mode={previewMode}
        gamut={gamut}
        onChange={(accent) => {
          setTheme((p) => ({ ...p, accent }));
          applyPreview(accent);
        }}
      />

      <Checkbox
        checked={!!theme.hideDotPattern}
        onChange={(v) => {
          setTheme((p) => ({ ...p, hideDotPattern: v }));
          applyThemeDecorations({ ...theme, hideDotPattern: v });
        }}
      >
        {t("settings.theme.hideDotPattern")}
      </Checkbox>

      <Checkbox
        checked={!!theme.pixelatedBackground}
        onChange={(v) => {
          setTheme((p) => ({ ...p, pixelatedBackground: v }));
          applyThemeDecorations({ ...theme, pixelatedBackground: v });
        }}
      >
        {t("settings.theme.pixelatedBackground")} <Hint content={t("settings.theme.pixelatedBackgroundHint")} />
      </Checkbox>

      <div className={editorActions}>
        <DSButton variant="secondary" onClick={onClose}>
          {t("back")}
        </DSButton>
        <DSButton disabled={!backgroundUrl && !themeFromProps} onClick={saveTheme}>
          {t("save")}
        </DSButton>
      </div>
    </div>
  );
};
