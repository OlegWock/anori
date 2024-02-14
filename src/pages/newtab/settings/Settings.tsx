import browser from 'webextension-polyfill';
import { useFolders } from '@utils/user-data/hooks';
import './Settings.scss';
import { AnimatePresence, LayoutGroup, m } from 'framer-motion';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { AnoriPlugin, homeFolder } from '@utils/user-data/types';
import { storage, useAtomWithStorage, useBrowserStorageValue } from '@utils/storage/api';
import { availablePlugins } from '@plugins/all';
import { usePluginConfig } from '@utils/plugin';
import { Checkbox } from '@components/Checkbox';
import { Hint } from '@components/Hint';
import { ScrollArea } from '@components/ScrollArea';
import moment from 'moment-timezone';
import { ComponentProps, Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { CUSTOM_ICONS_AVAILABLE, CUSTOM_ICONS_FOLDER_NAME, getAllCustomIconFiles, isValidCustomIconName, deleteAllCustomIcons, useCustomIcons } from '@utils/custom-icons';
import { guid } from '@utils/misc';
import { Input } from '@components/Input';
import { downloadBlob, showOpenFilePicker } from '@utils/files';
import { Tooltip } from '@components/Tooltip';
import JSZip from 'jszip';
import { analyticsEnabledAtom } from '@utils/analytics';
import { FolderItem } from './FolderItem';
import { atom, useAtom, useSetAtom } from 'jotai';
import { Modal } from '@components/Modal';
import { setPageTitle } from '@utils/mount';
import { ShortcutsHelp } from '@components/ShortcutsHelp';
import { Trans, useTranslation } from 'react-i18next';
import { Select } from '@components/Select';
import { Language, SHOW_LANGUAGE_SELECT_IN_SETTINGS, availableTranslations, availableTranslationsPrettyNames, switchTranslationLanguage } from '@translations/index';
import { useScreenWidth } from '@utils/compact';
import { Alert } from '@components/Alert';
import { IS_TOUCH_DEVICE } from '@utils/device';
import { CheckboxWithPermission } from '@components/CheckboxWithPermission';
import { migrateStorage } from '@utils/storage/migrations';
import { useDirection } from '@radix-ui/react-direction';
import { ThemesScreen } from './ThemesScreen';
import { OPFS_AVAILABLE } from '@utils/opfs';
import { CUSTOM_THEMES_FOLDER_NAME, deleteAllThemeBackgrounds, getAllCustomThemeBackgroundFiles, saveThemeBackground } from '@utils/user-data/theme';

export const ReorderGroup = lazy(() => import('@utils/motion/lazy-load-reorder').then(m => ({ default: m.ReorderGroup })));

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

const MainScreen = (props: ComponentProps<typeof m.div>) => {
    const setScreen = useSetAtom(currentScreenAtom);
    const { t } = useTranslation();
    const hasPluginsWithSettings = availablePlugins.filter(p => p.configurationScreen !== null).length !== 0;

    return (<m.div {...props} className='MainSettingsScreen'>
        <ScreenButton onClick={() => setScreen('general')} icon='ion:settings-sharp' name={t('settings.general.title')} />
        {CUSTOM_ICONS_AVAILABLE && <ScreenButton onClick={() => setScreen('custom-icons')} icon='ion:file-tray-full' name={t('settings.customIcons.title')} />}
        <ScreenButton onClick={() => setScreen('folders')} icon='ion:folder-open-sharp' name={t('settings.folders.title')} />
        {hasPluginsWithSettings && <ScreenButton onClick={() => setScreen('plugins')} icon='ion:code-slash-sharp' name={t('settings.pluginSettings.title')} />}
        <ScreenButton onClick={() => setScreen('theme')} icon='ion:color-palette' name={t('settings.theme.title')} />
        <ScreenButton onClick={() => setScreen('import-export')} icon='ion:archive-sharp' name={t('settings.importExport.title')} />
        <ScreenButton onClick={() => setScreen('about-help')} icon='ion:help-buoy-sharp' name={t('settings.aboutHelp.title')} />
    </m.div>)
};

const PluginConfigurationSection = <T extends {}>({ plugin }: { plugin: AnoriPlugin<T> }) => {
    const [config, setConfig, isLoaded] = usePluginConfig(plugin);
    if (!plugin.configurationScreen || !isLoaded) return null;

    return (<section>
        <h2>{plugin.name}</h2>
        <plugin.configurationScreen currentConfig={config} saveConfiguration={setConfig} />
    </section>);
};





const GeneralSettingsScreen = (props: ComponentProps<typeof m.div>) => {
    const [stealFocus, setStealFocus] = useBrowserStorageValue('stealFocus', false);
    const [language, setLanguage] = useBrowserStorageValue('language', 'en');
    const [isAutomaticCompact, setAutomaticCompact] = useBrowserStorageValue('automaticCompactMode', !IS_TOUCH_DEVICE);
    const [automaticCompactModeThreshold, setAutomaticCompactModeThreshold] = useBrowserStorageValue('automaticCompactModeThreshold', 1500);
    const [manualCompactMode, setManualCompactMode] = useBrowserStorageValue('compactMode', IS_TOUCH_DEVICE);
    const [showLoadAnimation, setShowLoadAnimation] = useBrowserStorageValue('showLoadAnimation', false);
    const [hideEditFolderButton, setHideEditFolderButton] = useBrowserStorageValue('hideEditFolderButton', false);
    const [rememberLastFolder, setRememberLastFolder] = useBrowserStorageValue('rememberLastFolder', false);
    const [showBookmarksBar, setShowBookmarksBar] = useBrowserStorageValue('showBookmarksBar', false);
    const [newTabTitle, setNewTabTitle] = useBrowserStorageValue('newTabTitle', 'Anori new tab');
    const [sidebarOrientation, setSidebarOrientation] = useBrowserStorageValue('sidebarOrientation', 'auto');
    const [analyticsEnabled, setAnalyticsEnabled] = useAtomWithStorage(analyticsEnabledAtom);
    const screenWidth = useScreenWidth();
    const { t } = useTranslation();

    const screenSizeBreakpoints = useMemo(() => [
        500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
        1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800,
        2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000
    ], []);

    useEffect(() => {
        setPageTitle(newTabTitle);
    }, [newTabTitle]);

    return (<m.div {...props} className='GeneralSettingsScreen'>
        {SHOW_LANGUAGE_SELECT_IN_SETTINGS && <div className='input-wrapper'>
            <label>{t("settings.general.language")}:</label>
            <Select<Language>
                value={language}
                onChange={(newLang) => {
                    console.log('Saving new language', newLang);
                    setLanguage(newLang);
                    switchTranslationLanguage(newLang);
                }}
                options={availableTranslations}
                getOptionKey={o => o}
                getOptionLabel={o => availableTranslationsPrettyNames[o]}
            />

            <Alert level="info" className='translation-alert'>
                <Trans t={t} i18nKey="settings.general.translationInfo">
                    <a href="https://github.com/OlegWock/anori/issues/104"></a>
                </Trans>
            </Alert>
        </div>}
        <div className='input-wrapper'>
            <label>{t("settings.general.sidebarOrientation")}:</label>
            <Select<typeof sidebarOrientation>
                value={sidebarOrientation}
                onChange={setSidebarOrientation}
                options={['auto', 'vertical', 'horizontal']}
                getOptionKey={o => o}
                getOptionLabel={o => t(`settings.general.sidebarOrientationOption-${o}`)}
            />
        </div>
        <div className='input-wrapper'>
            <label>{t("settings.general.newTabTitle")}: </label>
            <Input value={newTabTitle} onValueChange={setNewTabTitle} />
        </div>

        <Checkbox checked={analyticsEnabled} onChange={setAnalyticsEnabled}>
            {t("settings.general.enableAnalytics")}
            <Hint hasClickableContent content={<>
                <div>{t("settings.general.analyticsHintP1")}</div>

                <div style={{ marginTop: '0.5rem' }}>
                    <Trans t={t} i18nKey="settings.general.analyticsHintP2">
                        <a href="https://anori.app/privacy#analytics" target="_blank"></a>
                    </Trans>
                </div>
            </>} />
        </Checkbox>

        <Checkbox checked={rememberLastFolder} onChange={(v) => {
            setRememberLastFolder(v);
            if (!v) storage.setOne('lastFolder', undefined);
        }}>
            {t("settings.general.rememberLastFolder")}
        </Checkbox>

        {/* Bookmarks API absent in Safari */}
        {/* In Firefox, we can't get favicon https://bugzilla.mozilla.org/show_bug.cgi?id=1315616 */}
        {X_BROWSER === 'chrome' && <CheckboxWithPermission permissions={["bookmarks", "favicon"]} onChange={setShowBookmarksBar} checked={showBookmarksBar}>
            {t('settings.general.showBookmarksBar')}
        </CheckboxWithPermission>}

        {/* Focus stealer works only in Chrome and Edge */}
        {X_BROWSER === 'chrome' && <Checkbox checked={stealFocus} onChange={setStealFocus}>
            {t("settings.general.stealFocus")}
            <Hint content={t("settings.general.stealFocusHint")} />
        </Checkbox>}
        <Checkbox checked={manualCompactMode} onChange={setManualCompactMode} disabled={isAutomaticCompact}>
            {t("settings.general.useCompact")}
        </Checkbox>
        <Checkbox checked={isAutomaticCompact} onChange={setAutomaticCompact}>
            {t("settings.general.automaticCompact")}
        </Checkbox>
        {isAutomaticCompact && <div>
            <label>{t('settings.general.automaticCompactModeThreshold')}</label>
            <Select<number>
                options={screenSizeBreakpoints}
                getOptionKey={o => o.toString()}
                getOptionLabel={o => `< ${o}${t('px')}`}
                value={automaticCompactModeThreshold}
                onChange={setAutomaticCompactModeThreshold}
            />
            <div className='screen-size-hint'>{t('settings.general.automaticCompactModeThresholdHint', { screenWidth: screenWidth })}</div>
        </div>}
        <Checkbox checked={showLoadAnimation} onChange={setShowLoadAnimation}>
            {t("settings.general.showAnimationOnOpen")}
            <Hint content={t("settings.general.showAnimationOnOpenHint")} />
        </Checkbox>
        <Checkbox checked={hideEditFolderButton} onChange={setHideEditFolderButton}>
            {t("settings.general.hideEditButton")}
            <Hint content={t("settings.general.hideEditButtonHint")} />
        </Checkbox>
    </m.div>);
};

const CustomIconsScreen = (props: ComponentProps<typeof m.div>) => {
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

    return (<m.div {...props} className='CustomIconsScreen'>
        {customIcons.length === 0 && <div className='no-custom-icons-alert'>
            {t("settings.customIcons.noIcons")}
        </div>}

        <m.div className='custom-icons-grid' layout>
            <LayoutGroup>
                <AnimatePresence initial={false} mode="sync">
                    {customIcons.map(icon => {
                        return (<m.div
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
                        </m.div>)
                    })}
                </AnimatePresence>
            </LayoutGroup>
        </m.div>

        {draftCustomIcons.length !== 0 && <m.div className='draft-icons-list' layout layoutRoot>
            {draftCustomIcons.map((draftCustomIcon) => {
                const validName = isValidCustomIconName(draftCustomIcon.name) || draftCustomIcon.name.length === 0;
                return (<m.div
                    layout="position"
                    layoutId={draftCustomIcon.id}
                    className='draft-icon-section'
                    key={draftCustomIcon.id}
                    initial={{ translateY: '10%', opacity: 0 }}
                    animate={{ translateY: '0%', opacity: 1, }}
                >
                    <img height={64} width={64} className='draft-icon-preview' src={draftCustomIcon.preview} alt={draftCustomIcon.name} />
                    <div className='draft-icon-name-wrapper'>
                        <Input className='draft-icon-name' placeholder={t('settings.customIcons.iconName')} value={draftCustomIcon.name} onValueChange={name => setDraftCustomIcons(p => p.map(i => i.id === draftCustomIcon.id ? { ...i, name } : i))} />
                        {!validName && <div className='draft-icon-name-error'>{t('settings.customIcons.nameContainsInvalidChars')}</div>}
                    </div>
                    <Button onClick={() => { setDraftCustomIcons(p => p.filter(i => i.id !== draftCustomIcon.id)); URL.revokeObjectURL(draftCustomIcon.preview) }}><Icon icon='ion:close' height={22} /></Button>
                </m.div>);
            })}

            {hasDraftIconsWithInvalidName && <Tooltip placement='top' label={t("settings.customIcons.invalidNames")} enableOnTouch>
                <Button visuallyDisabled>{t("settings.customIcons.saveIcons")}</Button>
            </Tooltip>}
            {!hasDraftIconsWithInvalidName && <Button onClick={saveDraftCustomIcons}>{t("settings.customIcons.saveIcons")}</Button>}
        </m.div>}

        {draftCustomIcons.length === 0 && <Tooltip label={t("settings.customIcons.supportedFormats")} maxWidth={500} placement='top' enableOnTouch>
            <Button onClick={importCustomIcons}>{t("settings.customIcons.importIcons")}</Button>
        </Tooltip>}
    </m.div>)
};

const FoldersScreen = (props: ComponentProps<typeof m.div>) => {
    const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
    const { t } = useTranslation();

    return (<m.div {...props} className='FoldersScreen'>
        <m.div>
            <FolderItem folder={homeFolder} />
            <Suspense>
                <ReorderGroup axis="y" values={folders} onReorder={setFolders} as="div">
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
                </ReorderGroup>
            </Suspense>
        </m.div>

        <Button className='add-folder-btn' onClick={() => createFolder()}>
            <Icon icon='ion:add' height={24} /> {t('settings.folders.createNew')}
        </Button>
    </m.div>)
};

const PluginsScreen = (props: ComponentProps<typeof m.div>) => {
    return (<m.div {...props} className='PluginsScreen'>
        {availablePlugins.filter(p => p.configurationScreen !== null).map(p => {
            return (<PluginConfigurationSection plugin={p} key={p.id} />);
        })}
    </m.div>);
};



const ImportExportScreen = (props: ComponentProps<typeof m.div>) => {
    const exportSettings = async () => {
        const zip = new JSZip();
        const storage = await browser.storage.local.get(null);
        zip.file('storage.json', JSON.stringify(storage, null, 4), { compression: 'DEFLATE' });
        zip.file('meta.json', JSON.stringify({
            extensionVersion: browser.runtime.getManifest().version,
            storageVersion: storage.storageVersion ?? 0,
            date: moment().toString(),
        }, null, 4), { compression: 'DEFLATE' });

        if (OPFS_AVAILABLE) {
            const customIconFiles = await getAllCustomIconFiles();
            customIconFiles.forEach(handle => zip.file(`opfs/${CUSTOM_ICONS_FOLDER_NAME}/${handle.name}`, handle.getFile(), { compression: 'DEFLATE' }));
            const customThemeFiles = await getAllCustomThemeBackgroundFiles();
            customThemeFiles.forEach(handle => zip.file(`opfs/${CUSTOM_THEMES_FOLDER_NAME}/${handle.name}`, handle.getFile(), { compression: 'DEFLATE' }));
        }
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
        const { storage: migratedStorage } = migrateStorage(parsedStorage);
        await browser.storage.local.clear();
        await browser.storage.local.set(migratedStorage);

        if (OPFS_AVAILABLE) {
            await deleteAllCustomIcons();
            await deleteAllThemeBackgrounds();
            const promises: Promise<void>[] = [];
            zip.folder(`opfs/${CUSTOM_ICONS_FOLDER_NAME}`)?.forEach((path, file) => {
                console.log('Importing', { file, path });
                promises.push(
                    file.async('arraybuffer').then(ab => {
                        return addNewCustomIcon(path, ab);
                    })
                );
            });
            zip.folder(`opfs/${CUSTOM_THEMES_FOLDER_NAME}`)?.forEach((path, file) => {
                console.log('Importing', { file, path });
                promises.push(
                    file.async('arraybuffer').then(ab => {
                        return saveThemeBackground(path, ab);
                    })
                );
            });

            await Promise.all(promises);
        }
        window.location.reload();
    };

    const { t } = useTranslation();

    const { addNewCustomIcon } = useCustomIcons();

    return (<m.div {...props} className='ImportExportScreen'>
        {X_BROWSER === 'safari' && <Alert>
            {/* Bug in question: https://bugs.webkit.org/show_bug.cgi?id=226440 */}
            {t('settings.importExport.safariBugAlert')}
        </Alert>}
        <div>{t('settings.importExport.info')}</div>
        <div className="import-export-button">
            <Button disabled={X_BROWSER === 'safari'} onClick={importSettings}>{t('settings.importExport.import')}</Button>
            <Button disabled={X_BROWSER === 'safari'} onClick={exportSettings}>{t('settings.importExport.export')}</Button>
        </div>
    </m.div>)
};

const HelpAboutScreen = (props: ComponentProps<typeof m.div>) => {
    const { t, i18n } = useTranslation();
    return (<m.div {...props} className='HelpAboutScreen'>
        <p>
            <Trans t={t} i18nKey="settings.aboutHelp.p1">
                <a href="https://github.com/OlegWock/anori"></a>
                <a href="https://github.com/OlegWock/anori/issues/new"></a>
            </Trans>
        </p>

        {i18n.language !== 'en' && <p>
            {t('settings.aboutHelp.onlyEnglishPlease')}
        </p>}

        <p>
            <Trans t={t} i18nKey="settings.aboutHelp.p4">
                <a href="https://sinja.io/support"></a>
            </Trans>
        </p>
        
        
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
    </m.div>)
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

    const dir = useDirection();

    const mainScreenEnter = { x: dir === 'ltr' ? '-30%' : '30%', opacity: 0 };
    const mainScreenExit = { x: dir === 'ltr' ? '-30%' : '30%', opacity: 0 };
    const innerScreenEnter = { x: dir === 'ltr' ? '30%' : '-30%', opacity: 0 };
    const innerScreenExit = { x: dir === 'ltr' ? '30%' : '-30%', opacity: 0 };
    const transition = { duration: 0.18 };


    return (<Modal
        title={screenPrettyName[screen]}
        className='SettingsModal'
        closable onClose={() => {
            onClose();
            setScreen('main');
        }}
        headerButton={screen !== 'main' ? <Button withoutBorder onClick={() => setScreen('main')}><Icon icon={dir === 'ltr' ? 'ion:arrow-back' : 'ion:arrow-forward'} width={24} height={24} /></Button> : undefined}
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