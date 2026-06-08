import { Select } from "@anori/components/lazy-components";
import { buildPalette, detectGamut, type Gamut } from "@anori/design-system/color-engine";
import { Button as DSButton } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { HueChromaPicker } from "@anori/design-system/components/HueChromaPicker/HueChromaPicker";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Slider } from "@anori/design-system/components/Slider/Slider";
import { showOpenFilePicker } from "@anori/utils/files";
import { useMirrorStateToRef, useRunAfterNextRender } from "@anori/utils/hooks";
import { guid } from "@anori/utils/misc";
import { setPageBackground } from "@anori/utils/page";
import { anoriSchema, type CustomTheme, getAnoriStorage } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import {
  applyTheme,
  applyThemeColors,
  type ColorScheme,
  defaultTheme,
  deleteThemeBackgrounds,
  getThemeBackground,
  getThemeBackgroundOriginal,
  type PartialCustomTheme,
  resolveColorScheme,
  saveThemeBackground,
  type Theme,
  themes,
} from "@anori/utils/user-data/theme";
import { useCurrentTheme } from "@anori/utils/user-data/theme-hooks";
import { m } from "framer-motion";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva, cx } from "styled-system/css";
import browser from "webextension-polyfill";

const COLOR_SCHEMES: ColorScheme[] = ["system", "light", "dark"];
const COLOR_SCHEME_LABEL_KEY: Record<ColorScheme, string> = {
  system: "settings.theme.colorSchemeSystem",
  light: "settings.theme.colorSchemeLight",
  dark: "settings.theme.colorSchemeDark",
};

const screen = css({ display: "flex", flexDirection: "column", gap: "4" });
const header = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" });
const grid = css({ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "3" });

const plate = css({
  position: "relative",
  height: "84px",
  "& .theme-plate-actions": { opacity: 0, transition: "opacity 0.15s ease" },
  "&:hover .theme-plate-actions, &:focus-within .theme-plate-actions": { opacity: 1 },
});
const plateButton = cva({
  base: {
    appearance: "none",
    position: "absolute",
    inset: 0,
    padding: 0,
    borderRadius: "lg",
    backgroundColor: "transparent",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundClip: "padding-box",
    borderWidth: "3px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
  },
  variants: { active: { true: { borderColor: "accent" } } },
});
const colorCircle = css({
  position: "absolute",
  bottom: "1-5",
  left: "1-5",
  width: "18px",
  height: "18px",
  borderRadius: "full",
});
const plateActions = css({ position: "absolute", top: "1", right: "1", display: "flex", gap: "1" });

const editorPanel = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  padding: "4",
  borderRadius: "lg",
  bg: "control",
  boxShadow: "control.edge",
});
const preview = css({
  position: "relative",
  overflow: "hidden",
  height: "160px",
  borderRadius: "md",
  // Tiny checkerboard placeholder, shown until an image is selected.
  background: "repeating-conic-gradient(var(--ds-frosted-strong) 0% 25%, transparent 0% 50%) 50% / 18px 18px",
});
// The image layer is blurred live with a cheap CSS filter; it's oversized (negative inset scales with
// the blur radius) so the blur has real pixels to sample at the edges instead of fading to transparent.
const previewImage = css({ position: "absolute", backgroundSize: "cover", backgroundPosition: "center" });
const editorActions = css({ display: "flex", justifyContent: "flex-end", gap: "3" });

const ThemePlate = ({
  theme,
  active,
  gamut,
  onSelect,
  onEdit,
  onDelete,
}: {
  theme: Theme;
  active: boolean;
  gamut: Gamut;
  onSelect: VoidFunction;
  onEdit?: VoidFunction;
  onDelete?: VoidFunction;
}) => {
  const { t } = useTranslation();
  // Show the palette's accent (step 6), not the raw input colour — the input lightness is ignored, so
  // the raw value can look off; this is the swatch the theme actually produces.
  const accentSwatch = useMemo(() => buildPalette(theme.accent, "dark", gamut).scales.accent[7], [theme.accent, gamut]);
  const [backgroundUrl, setBackgroundUrl] = useState(() => {
    return theme.type === "builtin"
      ? browser.runtime.getURL(`/assets/images/backgrounds/previews/${theme.background}`)
      : null;
  });
  const backgroundUrlRef = useMirrorStateToRef(backgroundUrl);

  useEffect(() => {
    const main = async () => {
      if (theme.type === "custom") {
        const blob = await getThemeBackground(theme.name);
        const url = URL.createObjectURL(blob);
        setBackgroundUrl(url);
      }
    };
    main();
    if (theme.type === "custom") {
      return () => {
        if (backgroundUrlRef.current) {
          URL.revokeObjectURL(backgroundUrlRef.current);
        }
      };
    }
  }, [theme]);

  return (
    <div className={plate}>
      <button
        type="button"
        className={plateButton({ active })}
        style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined }}
        onClick={onSelect}
      >
        <div className={colorCircle} style={{ backgroundColor: accentSwatch }} />
      </button>

      {(onEdit || onDelete) && (
        <div className={cx(plateActions, "theme-plate-actions")}>
          {onEdit && (
            <IconButton
              variant="secondary"
              size="compact"
              icon={builtinIcons.pencil}
              label={t("edit")}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            />
          )}
          {onDelete && (
            <IconButton
              variant="secondary"
              size="compact"
              icon={builtinIcons.trash}
              label={t("settings.theme.removeTheme")}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

const ThemeEditor = ({ theme: themeFromProps, onClose }: { theme?: CustomTheme; onClose: VoidFunction }) => {
  const loadBackground = async () => {
    const files = await showOpenFilePicker(false, ".jpg,.jpeg,.png");
    if (!files[0]) return;
    const background = files[0];
    originalBackgroundBlob.current = background;
    setOriginalUrl(URL.createObjectURL(background));
    applyBlur(theme.blur);
  };

  const applyBlur = useCallback((blur: number) => {
    if (!originalBackgroundBlob.current) return;
    const bgUrl = URL.createObjectURL(originalBackgroundBlob.current);
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
    runAfterRender(() => applyThemeColors(accent, resolveColorScheme(colorScheme)));
  };

  const saveTheme = async () => {
    if (!originalBackgroundBlob.current || !blurredBackgroundBlob.current) return;

    const id = theme.name;
    await saveThemeBackground(id, "original", originalBackgroundBlob.current);
    await saveThemeBackground(id, "blurred", blurredBackgroundBlob.current);

    const toSave: CustomTheme = { name: theme.name, type: "custom", blur: theme.blur, accent: theme.accent };
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
    onClose();
  };

  const [colorScheme] = useStorageValue(anoriSchema.colorScheme);
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
        originalBackgroundBlob.current = original;
        blurredBackgroundBlob.current = blurred;
        setOriginalUrl(URL.createObjectURL(original));
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
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => (backgroundUrl ? URL.revokeObjectURL(backgroundUrl) : undefined);
  }, [backgroundUrl]);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => (originalUrl ? URL.revokeObjectURL(originalUrl) : undefined);
  }, [originalUrl]);

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
  useEffect(() => {
    applyThemeColors(accentRef.current, resolveColorScheme(colorScheme));
    if (backgroundUrlRef.current) setPageBackground(backgroundUrlRef.current);
  }, [colorScheme]);

  const runAfterRender = useRunAfterNextRender();
  const previewBlur = theme.blur * previewScale;

  return (
    <div className={editorPanel}>
      <Heading level={3}>{themeFromProps ? t("settings.theme.editTheme") : t("settings.theme.newTheme")}</Heading>

      <div ref={previewRef} className={preview}>
        {originalUrl && (
          <div
            className={previewImage}
            style={{
              inset: `-${previewBlur * 2}px`,
              backgroundImage: `url(${originalUrl})`,
              filter: `blur(${previewBlur}px)`,
            }}
          />
        )}
      </div>

      <DSButton variant="secondary" onClick={loadBackground}>
        {backgroundUrl ? t("settings.theme.changeBackground") : t("settings.theme.selectBackground")}
      </DSButton>

      <Field label={`${t("settings.theme.blur")}:`}>
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
        gamut={gamut}
        onChange={(accent) => {
          setTheme((p) => ({ ...p, accent }));
          applyPreview(accent);
        }}
      />

      <div className={editorActions}>
        <DSButton variant="secondary" onClick={onClose}>
          {t("back")}
        </DSButton>
        <DSButton disabled={!backgroundUrl} onClick={saveTheme}>
          {t("save")}
        </DSButton>
      </div>
    </div>
  );
};

export const ThemesScreen = (props: ComponentProps<typeof m.div>) => {
  const { t } = useTranslation();
  const [customThemes, setCustomThemes] = useStorageValue(anoriSchema.customThemes);
  const [currentTheme, setTheme] = useStorageValue(anoriSchema.theme);
  const [colorScheme, setColorScheme] = useStorageValue(anoriSchema.colorScheme);
  const [editorActive, setEditorActive] = useState(false);
  const [editorTheme, setEditorTheme] = useState<CustomTheme | undefined>(undefined);

  const mode = resolveColorScheme(colorScheme);
  const gamut = useMemo(() => detectGamut(), []);

  const openEditor = (theme?: CustomTheme) => {
    setEditorTheme(theme);
    setEditorActive(true);
  };

  return (
    <m.div {...props} className={screen}>
      <div className={header}>
        <Heading level={2} size={1}>
          {t("settings.theme.title")}
        </Heading>
        <DSButton iconStart={builtinIcons.add} onClick={() => openEditor()}>
          {t("settings.theme.newTheme")}
        </DSButton>
      </div>

      {editorActive && (
        <ThemeEditor key={editorTheme?.name ?? "new"} theme={editorTheme} onClose={() => setEditorActive(false)} />
      )}

      <div className={grid}>
        {[...themes, ...customThemes].map((theme) => (
          <ThemePlate
            key={theme.name}
            theme={theme}
            active={theme.name === currentTheme}
            gamut={gamut}
            onSelect={() => {
              setTheme(theme.name);
              applyTheme(theme, mode);
            }}
            onEdit={theme.type === "custom" ? () => openEditor(theme) : undefined}
            onDelete={
              theme.type === "custom"
                ? () => {
                    setCustomThemes((prev) => prev.filter((t) => t.name !== theme.name));
                    deleteThemeBackgrounds(theme.name);
                    if (currentTheme === theme.name) {
                      setTheme(defaultTheme.name);
                      applyTheme(defaultTheme, mode);
                    }
                  }
                : undefined
            }
          />
        ))}
      </div>

      <Field label={`${t("settings.theme.colorScheme")}:`}>
        <Select<ColorScheme>
          options={COLOR_SCHEMES}
          value={colorScheme}
          onChange={setColorScheme}
          getOptionKey={(s) => s}
          getOptionLabel={(s) => t(COLOR_SCHEME_LABEL_KEY[s])}
        />
      </Field>
    </m.div>
  );
};
