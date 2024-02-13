import { ButtonProps, Button } from "@components/Button";
import { toCss } from "@utils/color";
import { storage, useBrowserStorageValue } from "@utils/storage/api";
import { CUSTOM_THEMES_FOLDER_NAME, CustomTheme, PartialCustomTheme, Theme, applyTheme, applyThemeColors, defaultTheme, deleteThemeBackgrounds, getThemeBackground, getThemeBackgroundOriginal, saveThemeBackground, themes, useCurrentTheme } from "@utils/user-data/theme";
import clsx from "clsx";
import { m } from "framer-motion";
import { ComponentProps, useEffect, useRef, useState } from "react";
import browser from 'webextension-polyfill';
import "./ThemesScreen.scss";
import { guid } from "@utils/misc";
import { useTranslation } from "react-i18next";
import { showOpenFilePicker } from "@utils/files";
import { Slider } from "@components/Slider";
import { ColorPicker } from "@components/ColorPicker";
import { useMirrorStateToRef, useRunAfterNextRender } from "@utils/hooks";
import { setPageBackground } from "@utils/mount";
import { getDirectoryInRoot } from "@utils/opfs";
import { Icon } from "@components/Icon";





const ThemePlate = ({ theme, className, onEdit, onDelete, ...props }: { theme: Theme, onEdit?: VoidFunction, onDelete?: VoidFunction } & ButtonProps) => {
    const [backgroundUrl, setBackgroundUrl] = useState(() => {
        return theme.type === 'builtin' ? browser.runtime.getURL(`/assets/images/backgrounds/previews/${theme.background}`) : null;
    });

    useEffect(() => {
        const main = async () => {
            if (theme.type === 'custom') {
                const blob = await getThemeBackground(theme.name);
                const url = URL.createObjectURL(blob);
                setBackgroundUrl(url);
            }
        }
        main();
        if (theme.type === 'custom') {
            return () => URL.revokeObjectURL(backgroundUrl!);
        }
    }, [theme]);

    return (<Button
        style={{ backgroundImage: `url(${backgroundUrl})` }}
        className={clsx('BackgroundPlate', className)}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', duration: 0.1 }}
        withoutBorder
        {...props}
    >
        <div className="theme-actions">
            {!!onEdit && <Button onClick={e => {
                e.stopPropagation();
                onEdit();
            }}><Icon icon='ion:pencil' height={16} /></Button>}
            {!!onDelete && <Button onClick={e => {
                e.stopPropagation();
                onDelete();
            }}><Icon icon='ion:close' height={16} /></Button>}
        </div>

        <div className="color-cirles-wrapper">
            <div className='color-circle' style={{ backgroundColor: toCss(theme.colors.background) }} />
            <div className='color-circle' style={{ backgroundColor: toCss(theme.colors.text) }} />
            <div className='color-circle' style={{ backgroundColor: toCss(theme.colors.accent) }} />
        </div>
    </Button>);
};

const ThemeEditor = ({ theme: themeFromProps, onClose }: { theme?: CustomTheme, onClose: VoidFunction }) => {
    const loadBackground = async () => {
        const files = await showOpenFilePicker(false, '.jpg,.jpeg,.png');
        const background = files[0]!;
        originalBackgroundBlob.current = background;
        applyBlur(theme.blur);
    };

    const applyBlur = (blur: number) => {
        if (!originalBackgroundBlob.current) return;
        const bgUrl = URL.createObjectURL(originalBackgroundBlob.current);
        const img = new Image();
        img.src = bgUrl;
        img.onload = () => {
            const PADDING = blur * 2;
            const canvas = document.createElement('canvas');
            canvas.width = img.width + PADDING * 2;
            canvas.height = img.height + PADDING * 2;
            const ctx = canvas.getContext('2d')!;
            ctx.filter = `blur(${blur}px)`;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = img.width;
            croppedCanvas.height = img.height;
            const croppedCtx = croppedCanvas.getContext('2d')!;
            croppedCtx.drawImage(canvas, PADDING, PADDING, img.width, img.height, 0, 0, img.width, img.height)

            // Optional: Convert canvas to Blob, then to File for further use
            croppedCanvas.toBlob(blob => {
                if (!blob) return;
                blurredBackgroundBlob.current = blob;
                const url = URL.createObjectURL(blurredBackgroundBlob.current);
                setBackgroundUrl(url);
                setPageBackground(url);
                URL.revokeObjectURL(bgUrl);
            }, 'image/png');
        };
    };

    const applyPreview = () => {
        runAfterRender(() => applyThemeColors(theme.colors));
    };

    const saveTheme = async () => {
        if (!originalBackgroundBlob.current || !blurredBackgroundBlob.current) return;

        const id = theme.name;
        saveThemeBackground(`${id}-original`, originalBackgroundBlob.current);
        saveThemeBackground(`${id}-blurred`, blurredBackgroundBlob.current);

        let { customThemes = [] } = await storage.get('customThemes')
        if (themeFromProps) {
            customThemes = customThemes.map(t => {
                if (t.name === id) return theme;
                return t;
            })
        } else {
            customThemes.push(theme);
        }
        await storage.setOne('customThemes', customThemes);
        setCurrentTheme(theme.name);
        onClose();
    };


    const [currentTheme, setCurrentTheme] = useCurrentTheme();

    const [theme, setTheme] = useState<PartialCustomTheme>(() => {
        if (themeFromProps) return themeFromProps;
        return {
            name: guid(),
            type: 'custom',
            blur: 5,
            colors: {
                accent: currentTheme.colors.accent,
                background: currentTheme.colors.background,
                text: currentTheme.colors.text,
            }
        }
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
                console.log('Error while trying to load background', err);
            }
        };

        main();
    }, []);

    const { t } = useTranslation();
    const originalBackgroundBlob = useRef<Blob | null>(null);
    const blurredBackgroundBlob = useRef<Blob | null>(null);
    const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
    useEffect(() => {
        return () => backgroundUrl ? URL.revokeObjectURL(backgroundUrl) : undefined;
    }, [backgroundUrl]);

    const [currentlyEditingColor, setCurrentlyEditingColor] = useState<keyof PartialCustomTheme["colors"] | null>(null);

    const bgStyles = backgroundUrl ? {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundImage: `url(${backgroundUrl})`,
    } : {};

    const runAfterRender = useRunAfterNextRender();

    return (<>
        <div className="theme-editor">
            <div
                className="theme-preview"
                style={bgStyles}
            >
            </div>

            <div className="background-and-blur">
                <Button onClick={loadBackground}>{t('settings.theme.selectBackground')}</Button>
                <Slider
                    value={theme.blur}
                    min={0}
                    max={50}
                    onChange={(val) => setTheme(p => ({ ...p, blur: val }))}
                    onCommit={(val) => applyBlur(val)}
                />
            </div>
            <div className="swatches">
                <button onClick={() => setCurrentlyEditingColor('accent')} style={{ background: toCss(theme.colors.accent) }} />
                <button onClick={() => setCurrentlyEditingColor('background')} style={{ background: toCss(theme.colors.background) }} />
                <button onClick={() => setCurrentlyEditingColor('text')} style={{ background: toCss(theme.colors.text) }} />
            </div>

            {!!currentlyEditingColor && <ColorPicker
                className="color-picker"
                value={theme.colors[currentlyEditingColor]}
                onChange={(color) => {
                    setTheme(p => ({
                        ...p,
                        colors: {
                            ...p.colors,
                            [currentlyEditingColor]: color
                        }
                    }));
                    applyPreview();
                }}
            />}
        </div>

        <div className="action-buttons">
            <Button onClick={() => {
                onClose();
                applyTheme(currentTheme);
            }}>{t('back')}</Button>
            <Button disabled={!backgroundUrl} onClick={saveTheme}>{t('save')}</Button>
        </div>

    </>);
};

export const ThemesScreen = (props: ComponentProps<typeof m.div>) => {
    const { t } = useTranslation();
    const [customThemes, setCustomThemes] = useBrowserStorageValue('customThemes', []);
    const [currentTheme, setTheme] = useBrowserStorageValue('theme', defaultTheme.name);
    const [editorActive, setEditorActive] = useState(false);
    const [editorTheme, setEditorTheme] = useState<CustomTheme | undefined>(undefined);

    return (<m.div {...props} className='ThemesScreen'>
        {editorActive ? <>
            <ThemeEditor theme={editorTheme} onClose={() => setEditorActive(false)} />
        </> : <>
            <div className="themes-grid">
                {[...themes, ...customThemes].map((theme) => {
                    return (<ThemePlate
                        theme={theme}
                        className={clsx({ 'active': theme.name === currentTheme })}
                        onClick={() => {
                            setTheme(theme.name);
                            applyTheme(theme);
                        }}
                        onEdit={theme.type === 'custom' ? () => {
                            setEditorTheme(theme);
                            setEditorActive(true);
                        } : undefined}
                        onDelete={theme.type === 'custom' ? () => {
                            setCustomThemes(prev => prev.filter(t => t.name !== theme.name));
                            deleteThemeBackgrounds(theme.name);
                            if (currentTheme === theme.name) {
                                setTheme(defaultTheme.name);
                                applyTheme(defaultTheme);
                            }
                        } : undefined}
                        key={theme.name}
                    />)
                })}
            </div>
            <Button onClick={() => setEditorActive(true)}>{t('settings.theme.createCustom')}</Button>
        </>}
    </m.div>)
};