import { Button, type ButtonProps } from "@anori/components/Button";
import { Select } from "@anori/components/lazy-components";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { hslColorToOklch, oklchToCss, oklchToHslColor } from "@anori/utils/color";
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
import clsx from "clsx";
import { m } from "framer-motion";
import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import browser from "webextension-polyfill";
import "./ThemesScreen.scss";
import { ColorPicker } from "@anori/components/ColorPicker";
import { Slider } from "@anori/components/Slider";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { showOpenFilePicker } from "@anori/utils/files";
import { useMirrorStateToRef, useRunAfterNextRender } from "@anori/utils/hooks";
import { guid } from "@anori/utils/misc";
import { setPageBackground } from "@anori/utils/page";
import { useCurrentTheme } from "@anori/utils/user-data/theme-hooks";
import { useTranslation } from "react-i18next";

const COLOR_SCHEMES: ColorScheme[] = ["system", "light", "dark"];
const COLOR_SCHEME_LABEL_KEY: Record<ColorScheme, string> = {
  system: "settings.theme.colorSchemeSystem",
  light: "settings.theme.colorSchemeLight",
  dark: "settings.theme.colorSchemeDark",
};

const ThemePlate = ({
  theme,
  className,
  onEdit,
  onDelete,
  ...props
}: { theme: Theme; onEdit?: VoidFunction; onDelete?: VoidFunction } & ButtonProps) => {
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
    <div className={clsx("BackgroundPlate", className)}>
      <Button
        className="main-btn"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", duration: 0.1 }}
        withoutBorder
        {...props}
      >
        <div className="color-cirles-wrapper">
          <div className="color-circle" style={{ backgroundColor: oklchToCss(theme.accent) }} />
        </div>
      </Button>

      <div className="theme-actions">
        {!!onEdit && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Icon icon={builtinIcons.pencil} height={16} />
          </Button>
        )}
        {!!onDelete && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Icon icon={builtinIcons.close} height={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

const ThemeEditor = ({ theme: themeFromProps, onClose }: { theme?: CustomTheme; onClose: VoidFunction }) => {
  const loadBackground = async () => {
    const files = await showOpenFilePicker(false, ".jpg,.jpeg,.png");
    if (!files[0]) return;
    const background = files[0];
    originalBackgroundBlob.current = background;
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

  useEffect(() => {
    const main = async () => {
      try {
        const original = await getThemeBackgroundOriginal(theme.name);
        const blurred = await getThemeBackground(theme.name);
        originalBackgroundBlob.current = original;
        blurredBackgroundBlob.current = blurred;
        applyBlur(theme.blur);
      } catch (err) {
        console.log("Error while trying to load background", err);
      }
    };

    main();
  }, [applyBlur, theme.blur, theme.name]);

  const { t } = useTranslation();
  const originalBackgroundBlob = useRef<Blob | null>(null);
  const blurredBackgroundBlob = useRef<Blob | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => (backgroundUrl ? URL.revokeObjectURL(backgroundUrl) : undefined);
  }, [backgroundUrl]);

  const bgStyles = backgroundUrl
    ? {
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundImage: `url(${backgroundUrl})`,
      }
    : {};

  const runAfterRender = useRunAfterNextRender();

  return (
    <>
      <div className="theme-editor">
        <div className="theme-preview" style={bgStyles} />

        <Button className="select-bg-btn" onClick={loadBackground}>
          {t("settings.theme.selectBackground")}
        </Button>

        <div className="blur-settings">
          <label>{t("settings.theme.blur")}:</label>
          <Slider
            value={theme.blur}
            min={0}
            max={50}
            onChange={(val) => setTheme((p) => ({ ...p, blur: val }))}
            onCommit={(val) => applyBlur(val)}
          />
        </div>

        <ColorPicker
          className="color-picker"
          value={oklchToHslColor(theme.accent)}
          label={t("settings.theme.colorAccent")}
          onChange={(color) => {
            const modifiedColor = { ...color, saturation: color.lightness === 1 ? 0 : color.saturation };
            const accent = hslColorToOklch(modifiedColor);
            setTheme((p) => ({ ...p, accent }));
            applyPreview(accent);
          }}
        />
      </div>

      <div className="action-buttons">
        <Button onClick={onClose}>{t("back")}</Button>
        <Button disabled={!backgroundUrl} onClick={saveTheme}>
          {t("save")}
        </Button>
      </div>
    </>
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

  return (
    <m.div {...props} className="ThemesScreen">
      <Heading level={2} size={1} alignSelf="flex-start">
        {t("settings.theme.title")}
      </Heading>
      {editorActive ? (
        <ThemeEditor theme={editorTheme} onClose={() => setEditorActive(false)} />
      ) : (
        <>
          <div className="color-scheme-setting">
            <label>{t("settings.theme.colorScheme")}:</label>
            <Select<ColorScheme>
              options={COLOR_SCHEMES}
              value={colorScheme}
              onChange={setColorScheme}
              getOptionKey={(s) => s}
              getOptionLabel={(s) => t(COLOR_SCHEME_LABEL_KEY[s])}
            />
          </div>

          <div className="themes-grid">
            {[...themes, ...customThemes].map((theme) => {
              return (
                <ThemePlate
                  theme={theme}
                  className={clsx({ active: theme.name === currentTheme })}
                  onClick={() => {
                    setTheme(theme.name);
                    applyTheme(theme, mode);
                  }}
                  onEdit={
                    theme.type === "custom"
                      ? () => {
                          setEditorTheme(theme);
                          setEditorActive(true);
                        }
                      : undefined
                  }
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
                  key={theme.name}
                />
              );
            })}
          </div>
          <Button onClick={() => setEditorActive(true)}>{t("settings.theme.createCustom")}</Button>
        </>
      )}
    </m.div>
  );
};
