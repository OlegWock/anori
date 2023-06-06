import browser from 'webextension-polyfill';
import { useFolders } from '@utils/user-data/hooks';
import './Settings.scss';
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'framer-motion';
import { Button, ButtonProps } from '@components/Button';
import { Icon } from '@components/Icon';
import { AnoriPlugin, homeFolder } from '@utils/user-data/types';
import { useAtomWithStorage, useBrowserStorageValue } from '@utils/storage';
import clsx from 'clsx';
import { Theme, applyTheme, defaultTheme, themes } from '@utils/user-data/theme';
import { availablePlugins } from '@plugins/all';
import { usePluginConfig } from '@utils/plugin';
import { Checkbox } from '@components/Checkbox';
import { Hint } from '@components/Hint';
import { ScrollArea } from '@components/ScrollArea';
import { toCss } from '@utils/color';
import moment from 'moment-timezone';
import { ComponentProps, useEffect, useState } from 'react';
import { CUSTOM_ICONS_AVAILABLE, getAllCustomIconFiles, isValidCustomIconName, removeAllCustomIcons, useCustomIcons } from '@utils/custom-icons';
import { guid } from '@utils/misc';
import { Input } from '@components/Input';
import { downloadBlob, showOpenFilePicker } from '@utils/files';
import { Tooltip } from '@components/Tooltip';
import JSZip from 'jszip';
import { analyticsEnabledAtom } from '@utils/analytics';
import { FolderItem } from './FolderItem';
import { atom, useAtom } from 'jotai';
import { Modal } from '@components/Modal';
import { setPageTitle } from '@utils/mount';
import { ShortcutsHelp } from '@components/ShortcutsHelp';
import { Trans, useTranslation } from 'react-i18next';
import { Select } from '@components/Select';
import { Language, SHOW_LANGUAGE_SELECT_IN_SETTINGS, availableTranslations, availableTranslationsPrettyNames, switchTranslationLanguage } from '@translations/index';

type DraftCustomIcon = {
    id: string,
    name: string,
    extension: string,
    content: ArrayBuffer,
    preview: string
};

type SettingScreen = 'main' | 'general' | 'custom-icons' | 'folders' | 'plugins' | 'theme' | 'import-export' | 'about-help';
const currentScreenAtom = atom<SettingScreen>('main');


const ScreenButton = ({ icon, name, ...props }: { icon: string, name: string } & ComponentProps<"button">) => {
    return (<button className='ScreenButton' {...props}>
        <Icon icon={icon} width={48} height={48} className='icon' />
        <span>{name}</span>
    </button>);
};

const PluginConfigurationSection = <T extends {}>({ plugin }: { plugin: AnoriPlugin<T> }) => {
    const [config, setConfig, isDefault] = usePluginConfig(plugin);
    if (!plugin.configurationScreen || isDefault) return null;

    return (<section>
        <h3>{plugin.name}</h3>
        <plugin.configurationScreen currentConfig={config} saveConfiguration={setConfig} />
    </section>);
};

const ThemePlate = ({ theme, className, ...props }: { theme: Theme } & ButtonProps) => {
    const backgroundUrl = browser.runtime.getURL(`/assets/images/backgrounds/previews/${theme.background}`);
    return (<Button
        style={{ backgroundImage: `url(${backgroundUrl})` }}
        className={clsx('BackgroundPlate', className)}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', duration: 0.1 }}
        withoutBorder
        {...props}
    >
        <div className="color-cirles-wrapper">
            <div className='color-circle' style={{ backgroundColor: toCss(theme.colors.background) }} />
            <div className='color-circle' style={{ backgroundColor: toCss(theme.colors.text) }} />
            <div className='color-circle' style={{ backgroundColor: toCss(theme.colors.accent) }} />
        </div>
    </Button>);
};

const MainScreen = (props: ComponentProps<typeof motion.div>) => {
    const [screen, setScreen] = useAtom(currentScreenAtom);
    const { t } = useTranslation();
    const hasPluginsWithSettings = availablePlugins.filter(p => p.configurationScreen !== null).length !== 0;

    return (<motion.div {...props} className='MainSettingsScreen'>
        <ScreenButton onClick={() => setScreen('general')} icon='ion:settings-sharp' name={t('settings.general.title')} />
        {CUSTOM_ICONS_AVAILABLE && <ScreenButton onClick={() => setScreen('custom-icons')} icon='ion:file-tray-full' name={t('settings.customIcons.title')} />}
        <ScreenButton onClick={() => setScreen('folders')} icon='ion:folder-open-sharp' name={t('settings.folders.title')} />
        {hasPluginsWithSettings && <ScreenButton onClick={() => setScreen('plugins')} icon='ion:code-slash-sharp' name={t('settings.pluginSettings.title')} />}
        <ScreenButton onClick={() => setScreen('theme')} icon='ion:color-palette' name={t('settings.theme.title')} />
        <ScreenButton onClick={() => setScreen('import-export')} icon='ion:archive-sharp' name={t('settings.importExport.title')} />
        <ScreenButton onClick={() => setScreen('about-help')} icon='ion:help-buoy-sharp' name={t('settings.aboutHelp.title')} />
    </motion.div>)
};

const GeneralSettingsScreen = (props: ComponentProps<typeof motion.div>) => {
    const [stealFocus, setStealFocus] = useBrowserStorageValue('stealFocus', false);
    const [language, setLanguage] = useBrowserStorageValue('language', 'en');
    const [isAutomaticCompact, setAutomaticCompact] = useBrowserStorageValue('automaticCompactMode', true);
    const [manualCompactMode, setManualCompactMode] = useBrowserStorageValue('compactMode', false);
    const [showLoadAnimation, setShowLoadAnimation] = useBrowserStorageValue('showLoadAnimation', false);
    const [hideEditFolderButton, setHideEditFolderButton] = useBrowserStorageValue('hideEditFolderButton', false);
    const [newTabTitle, setNewTabTitle] = useBrowserStorageValue('newTabTitle', 'Anori new tab');
    const [analyticsEnabled, setAnalyticsEnabled] = useAtomWithStorage(analyticsEnabledAtom);
    const { t } = useTranslation();

    useEffect(() => {
        setPageTitle(newTabTitle);
    }, [newTabTitle]);

    return (<motion.div {...props} className='GeneralSettingsScreen'>
        {SHOW_LANGUAGE_SELECT_IN_SETTINGS && <div className='input-wrapper'>
            <label>{t("settings.general.language")}:</label>
            <Select<Language>
                value={language}
                onChange={(newLang) => {
                    setLanguage(newLang);
                    switchTranslationLanguage(newLang);
                }}
                options={availableTranslations}
                getOptionKey={o => o}
                getOptionLabel={o => availableTranslationsPrettyNames[o]}
            />
        </div>}
        <div className='input-wrapper'>
            <label>{t("settings.general.newTabTitle")}: <Hint content={t("settings.general.newTabTitleHint")} /></label>
            <Input value={newTabTitle} onValueChange={setNewTabTitle} />
        </div>

        <Checkbox checked={analyticsEnabled} onChange={setAnalyticsEnabled}>
            {t("settings.general.enableAnalytics")}
            <Hint content={<>
                {t("settings.general.analyticsHintP1")}

                <div style={{ marginTop: '0.5rem' }}>{t("settings.general.analyticsHintP2")}</div>
            </>} />
        </Checkbox>
        {/* Focus stealer works only in Chrome and Safari */}
        {X_BROWSER !== 'firefox' && <Checkbox checked={stealFocus} onChange={setStealFocus}>
            {t("settings.general.stealFocus")}
            <Hint content={t("settings.general.stealFocusHint")} />
        </Checkbox>}
        <Checkbox checked={isAutomaticCompact} onChange={setAutomaticCompact}>
            {t("settings.general.automaticCompact")}
        </Checkbox>
        <Checkbox checked={manualCompactMode} onChange={setManualCompactMode} disabled={isAutomaticCompact}>
            {t("settings.general.useCompact")}
        </Checkbox>
        <Checkbox checked={showLoadAnimation} onChange={setShowLoadAnimation}>
            {t("settings.general.showAnimationOnOpen")}
            <Hint content={t("settings.general.showAnimationOnOpenHint")} />
        </Checkbox>
        <Checkbox checked={hideEditFolderButton} onChange={setHideEditFolderButton}>
            {t("settings.general.hideEditButton")}
            <Hint content={t("settings.general.hideEditButtonHint")} />
        </Checkbox>
    </motion.div>);
};

const CustomIconsScreen = (props: ComponentProps<typeof motion.div>) => {
    const importCustomIcons = async () => {
        const files = await showOpenFilePicker(true, '.jpg,.jpeg,.png,.gif,.svg');
        let hasErrors = false;
        const importedFiles: DraftCustomIcon[] = await Promise.all(files.map(async (file) => {
            const id = guid();
            const arrayBuffer = await file.arrayBuffer();
            const preview = URL.createObjectURL(file);
            const tokens = file.name.split('.');
            const extension = tokens[tokens.length - 1];
            const name = tokens.slice(0, tokens.length - 1).join('.');
            if (!name || !extension || !['png', 'jpg', 'jpeg', 'svg'].includes(extension.toLowerCase())) {
                hasErrors = true;
            }

            return {
                id,
                content: arrayBuffer,
                name,
                extension,
                preview,
            };
        }));

        if (hasErrors) {
            // TODO: replace with toast
            alert(t('settings.customIcons.incorrectFormat'));
            return;
        }
        setDraftCustomIcons(p => [...p, ...importedFiles]);
    };

    const saveDraftCustomIcons = async () => {
        await Promise.all(draftCustomIcons.map(draftCustomIcon => addNewCustomIcon(`${draftCustomIcon.name}.${draftCustomIcon.extension}`, draftCustomIcon.content, draftCustomIcon.preview)));
        setDraftCustomIcons([]);
    };

    const { t } = useTranslation();
    const { customIcons, addNewCustomIcon, removeCustomIcon } = useCustomIcons();
    const [draftCustomIcons, setDraftCustomIcons] = useState<DraftCustomIcon[]>([]);
    const hasDraftIconsWithInvalidName = draftCustomIcons.some(i => !isValidCustomIconName(i.name));

    return (<motion.div {...props} className='CustomIconsScreen'>
        {customIcons.length === 0 && <div className='no-custom-icons-alert'>
            {t("settings.customIcons.noIcons")}
        </div>}

        <motion.div className='custom-icons-grid' layout>
            <LayoutGroup>
                <AnimatePresence initial={false} mode="sync">
                    {customIcons.map(icon => {
                        return (<motion.div
                            key={icon.name}
                            layout
                            layoutId={icon.name}
                            className='custom-icon-plate'
                            initial={{ x: 10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <img alt={icon.name} src={icon.urlObject} height={38} width={38} />
                            <div className='custom-icon-name'>{icon.name}</div>
                            <Button onClick={() => removeCustomIcon(icon.name)}><Icon icon='ion:close' height={22} /></Button>
                        </motion.div>)
                    })}
                </AnimatePresence>
            </LayoutGroup>
        </motion.div>

        {draftCustomIcons.length !== 0 && <motion.div className='draft-icons-list' layout layoutRoot>
            {draftCustomIcons.map((draftCustomIcon) => {
                const validName = isValidCustomIconName(draftCustomIcon.name) || draftCustomIcon.name.length === 0;
                return (<motion.div
                    layout="position"
                    layoutId={draftCustomIcon.id}
                    className='draft-icon-section'
                    key={draftCustomIcon.id}
                    initial={{ translateY: '10%', opacity: 0 }}
                    animate={{ translateY: '0%', opacity: 1, }}
                >
                    <img height={64} width={64} className='draft-icon-preview' src={draftCustomIcon.preview} alt={draftCustomIcon.name} />
                    <div className='draft-icon-name-wrapper'>
                        <Input className='draft-icon-name' value={draftCustomIcon.name} onValueChange={name => setDraftCustomIcons(p => p.map(i => i.id === draftCustomIcon.id ? { ...i, name } : i))} />
                        {!validName && <div className='draft-icon-name-error'>Name contains invalid characters, only letters, digits, - and _ are accepted.</div>}
                    </div>
                    <Button onClick={() => { setDraftCustomIcons(p => p.filter(i => i.id !== draftCustomIcon.id)); URL.revokeObjectURL(draftCustomIcon.preview) }}><Icon icon='ion:close' height={22} /></Button>
                </motion.div>);
            })}

            {hasDraftIconsWithInvalidName && <Tooltip placement='top' label={t("settings.customIcons.invalidNames")}>
                <Button visuallyDisabled>{t("settings.customIcons.saveIcons")}</Button>
            </Tooltip>}
            {!hasDraftIconsWithInvalidName && <Button onClick={saveDraftCustomIcons}>{t("settings.customIcons.saveIcons")}</Button>}
        </motion.div>}

        {draftCustomIcons.length === 0 && <Tooltip label={t("settings.customIcons.supportedFormats")} maxWidth={500} placement='top'>
            <Button onClick={importCustomIcons}>{t("settings.customIcons.importIcons")}</Button>
        </Tooltip>}
    </motion.div>)
};

const FoldersScreen = (props: ComponentProps<typeof motion.div>) => {
    const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
    const { t } = useTranslation();

    return (<motion.div {...props} className='FoldersScreen'>
        <motion.div>
            <FolderItem folder={homeFolder} />
            <Reorder.Group axis="y" values={folders} onReorder={setFolders} as="div">
                {folders.map((f, index) => {
                    return (
                        <FolderItem
                            key={f.id}
                            folder={f}
                            editable
                            onNameChange={name => updateFolder(f.id, { name })}
                            onIconChange={icon => updateFolder(f.id, { icon })}
                            onRemove={() => removeFolder(f.id)}
                        />)
                })}
            </Reorder.Group>
        </motion.div>

        <Button className='add-folder-btn' onClick={() => createFolder()}>
            <Icon icon='ion:add' height={24} /> {t('settings.folders.createNew')}
        </Button>
    </motion.div>)
};

const PluginsScreen = (props: ComponentProps<typeof motion.div>) => {
    return (<motion.div {...props} className='PluginsScreen'>
        {availablePlugins.filter(p => p.configurationScreen !== null).map(p => {
            return (<PluginConfigurationSection plugin={p} key={p.id} />);
        })}
    </motion.div>);
};

const ThemesScreen = (props: ComponentProps<typeof motion.div>) => {
    const [currentTheme, setTheme] = useBrowserStorageValue('theme', defaultTheme);

    return (<motion.div {...props} className='ThemesScreen'>
        {themes.map((theme) => {
            return (<ThemePlate
                theme={theme}
                className={clsx({ 'active': theme.name === currentTheme })}
                onClick={() => {
                    setTheme(theme.name);
                    applyTheme(theme.name);
                }}
                key={theme.name}
            />)
        })}
    </motion.div>)
};

const ImportExportScreen = (props: ComponentProps<typeof motion.div>) => {
    const exportSettings = async () => {
        const zip = new JSZip();
        const storage = await browser.storage.local.get(null);
        zip.file('storage.json', JSON.stringify(storage, null, 4), { compression: 'DEFLATE' });

        const customIconFiles = await getAllCustomIconFiles();
        customIconFiles.forEach(handle => zip.file(`opfs/${handle.name}`, handle.getFile(), { compression: 'DEFLATE' }))
        const blob = await zip.generateAsync({ type: "blob" });
        const datetime = moment().format('DD-MM-yyyy_HH-mm');
        downloadBlob(`anori-backup-${datetime}.zip`, blob);
    };

    const importSettings = async () => {
        const files = await showOpenFilePicker(false, '.zip');
        const file = files[0];
        const zip = await JSZip.loadAsync(file);
        const storageJson = await zip.file('storage.json')!.async('string');
        const parsedStorage = JSON.parse(storageJson);
        await browser.storage.local.set(parsedStorage);

        await removeAllCustomIcons();
        const promises: Promise<void>[] = [];
        zip.folder('opfs')!.forEach((path, file) => {
            console.log('Importing', { file, path })
            promises.push(
                file.async('arraybuffer').then(ab => {
                    return addNewCustomIcon(path, ab);
                })
            );
        });

        await Promise.all(promises);
        window.location.reload();
    };

    const { t } = useTranslation();

    const { addNewCustomIcon } = useCustomIcons();

    return (<motion.div {...props} className='ImportExportScreen'>
        <div>{t('settings.importExport.info')}</div>
        <div className="import-export-button">
            <Button onClick={importSettings}>{t('settings.importExport.import')}</Button>
            <Button onClick={exportSettings}>{t('settings.importExport.export')}</Button>
        </div>
    </motion.div>)
};

const HelpAboutScreen = (props: ComponentProps<typeof motion.div>) => {
    const { t, i18n } = useTranslation();
    return (<motion.div {...props} className='HelpAboutScreen'>
        <p>
            <Trans t={t} i18nKey="settings.aboutHelp.p1">
                <a href="https://github.com/OlegWock/anori"></a>.
                <a href="https://github.com/OlegWock/anori/issues/new"></a>
            </Trans>
        </p>
        {i18n.language !== 'en' && <p>
            {t('settings.aboutHelp.onlyEnglishPlease')}
        </p>}
        <p>
            <Trans t={t} i18nKey="settings.aboutHelp.p2">
                <a href="https://github.com/OlegWock/anori"></a>
            </Trans>
        </p>

        <p>
            <Trans t={t} i18nKey="settings.aboutHelp.p3">
                <a href="https://twitter.com/OlegWock"></a>
                <a href="https://stand-with-ukraine.pp.ua/"></a>
            </Trans>
        </p>

        <section className='shortcuts-section'>
            <h2>{t('shortcuts.title')}</h2>
            <ShortcutsHelp />
        </section>
    </motion.div>)
};

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const screenPrettyName = {
        'main': t('settings.title'),
        'general': t('settings.general.title'),
        'custom-icons': t('settings.customIcons.title'),
        'folders': t('settings.folders.title'),
        'plugins': t('settings.pluginSettings.title'),
        'theme': t('settings.theme.title'),
        'import-export': t('settings.importExport.title'),
        'about-help': t('settings.aboutHelp.title'),
    } as const;

    const [screen, setScreen] = useAtom(currentScreenAtom);

    const mainScreenEnter = { x: '-30%', opacity: 0 };
    const mainScreenExit = { x: '-30%', opacity: 0 };
    const innerScreenEnter = { x: '30%', opacity: 0 };
    const innerScreenExit = { x: '30%', opacity: 0 };
    const transition = { duration: 0.18 };


    return (<Modal
        title={screenPrettyName[screen]}
        className='SettingsModal'
        closable onClose={() => {
            onClose();
            setScreen('main');
        }}
        headerButton={screen !== 'main' ? <Button withoutBorder onClick={() => setScreen('main')}><Icon icon='ion:arrow-back' width={24} height={24} /></Button> : undefined}
    >
        <ScrollArea className='Settings'>
            <div className="settings-content">
                <AnimatePresence initial={false} mode='wait'>
                    {screen === 'main' && <MainScreen key='main' initial={mainScreenEnter} animate={{ x: 0, opacity: 1 }} exit={mainScreenExit} transition={transition} />}
                    {screen === 'general' && <GeneralSettingsScreen key='general' initial={innerScreenEnter} animate={{ x: 0, opacity: 1 }} exit={innerScreenExit} transition={transition} />}
                    {screen === 'custom-icons' && <CustomIconsScreen key='custom-icons' initial={innerScreenEnter} animate={{ x: 0, opacity: 1 }} exit={innerScreenExit} transition={transition} />}
                    {screen === 'folders' && <FoldersScreen key='folders' initial={innerScreenEnter} animate={{ x: 0, opacity: 1 }} exit={innerScreenExit} transition={transition} />}
                    {screen === 'plugins' && <PluginsScreen key='plugins' initial={innerScreenEnter} animate={{ x: 0, opacity: 1 }} exit={innerScreenExit} transition={transition} />}
                    {screen === 'theme' && <ThemesScreen key='theme' initial={innerScreenEnter} animate={{ x: 0, opacity: 1 }} exit={innerScreenExit} transition={transition} />}
                    {screen === 'import-export' && <ImportExportScreen key='import-export' initial={innerScreenEnter} animate={{ x: 0, opacity: 1 }} exit={innerScreenExit} transition={transition} />}
                    {screen === 'about-help' && <HelpAboutScreen key='about-help' initial={innerScreenEnter} animate={{ x: 0, opacity: 1 }} exit={innerScreenExit} transition={transition} />}
                </AnimatePresence>
            </div>
        </ScrollArea>
    </Modal>);
};