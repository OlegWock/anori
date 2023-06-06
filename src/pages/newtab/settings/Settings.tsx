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
import { useTranslation } from 'react-i18next';
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
const screenPrettyName = {
    'main': 'Settings',
    'general': 'General settings',
    'custom-icons': 'Custom icons',
    'folders': 'Folders',
    'plugins': 'Plugins settings',
    'theme': 'Theme',
    'import-export': 'Import & export',
    'about-help': 'Help & about the extension',
} as const;

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
        <ScreenButton onClick={() => setScreen('general')} icon='ion:settings-sharp' name={t('settings.general')} />
        {CUSTOM_ICONS_AVAILABLE && <ScreenButton onClick={() => setScreen('custom-icons')} icon='ion:file-tray-full' name={t('settings.customIcons')} />}
        <ScreenButton onClick={() => setScreen('folders')} icon='ion:folder-open-sharp' name="Folders" />
        {hasPluginsWithSettings && <ScreenButton onClick={() => setScreen('plugins')} icon='ion:code-slash-sharp' name="Plugins" />}
        <ScreenButton onClick={() => setScreen('theme')} icon='ion:color-palette' name="Theme" />
        <ScreenButton onClick={() => setScreen('import-export')} icon='ion:archive-sharp' name="Import & export" />
        <ScreenButton onClick={() => setScreen('about-help')} icon='ion:help-buoy-sharp' name="Help & about" />
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

    useEffect(() => {
        setPageTitle(newTabTitle);
    }, [newTabTitle]);

    return (<motion.div {...props} className='GeneralSettingsScreen'>
        {SHOW_LANGUAGE_SELECT_IN_SETTINGS && <div className='input-wrapper'>
            <label>Language:</label>
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
            <label>New tab title: <Hint content="We can't set icon for new page, but you can try using emoji here 😉" /></label>
            <Input value={newTabTitle} onValueChange={setNewTabTitle} />
        </div>

        <Checkbox checked={analyticsEnabled} onChange={setAnalyticsEnabled}>
            Enable sending analytics
            <Hint content={<>
                Analytics helps me better understand how users interact with Anori and
                which features are used the most. I doesn't share any private info like content of
                notes or URL of bookmarks.

                <div style={{ marginTop: '0.5rem' }}>This helps me to develop better product so I ask you to enable sending analytics.</div>
            </>} />
        </Checkbox>
        {/* Focus stealer works only in Chrome and Safari */}
        {X_BROWSER !== 'firefox' && <Checkbox checked={stealFocus} onChange={setStealFocus}>
            Steal focus from addressbar
            <Hint content='If enabled, this will force browser to move focus from address bar to this page when opening new tab and you will be able to use command menu (Cmd+K) without needing to move focus to page manually (by clicking or pressing Tab).' />
        </Checkbox>}
        <Checkbox checked={isAutomaticCompact} onChange={setAutomaticCompact}>
            Automatically switch to compact mode based on screen size
        </Checkbox>
        <Checkbox checked={manualCompactMode} onChange={setManualCompactMode} disabled={isAutomaticCompact}>
            Use compact mode
        </Checkbox>
        <Checkbox checked={showLoadAnimation} onChange={setShowLoadAnimation}>
            Show animation on open
            <Hint content="If enabled, extension will show quick loading animation which will hide initial flicker of loading data and provide better look." />
        </Checkbox>
        <Checkbox checked={hideEditFolderButton} onChange={setHideEditFolderButton}>
            Hide "Edit folder" button
            <Hint content="Extra minimalistic, yeah." />
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
            alert('Please provide valid file(s). Anori supports .png, .jpg, .gif, .jpeg and .svg');
            return;
        }
        setDraftCustomIcons(p => [...p, ...importedFiles]);
    };

    const saveDraftCustomIcons = async () => {
        await Promise.all(draftCustomIcons.map(draftCustomIcon => addNewCustomIcon(`${draftCustomIcon.name}.${draftCustomIcon.extension}`, draftCustomIcon.content, draftCustomIcon.preview)));
        setDraftCustomIcons([]);
    };

    const { customIcons, addNewCustomIcon, removeCustomIcon } = useCustomIcons();
    const [draftCustomIcons, setDraftCustomIcons] = useState<DraftCustomIcon[]>([]);
    const hasDraftIconsWithInvalidName = draftCustomIcons.some(i => !isValidCustomIconName(i.name));

    return (<motion.div {...props} className='CustomIconsScreen'>
        {customIcons.length === 0 && <div className='no-custom-icons-alert'>
            You don't have any custom icons yet.
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

            {hasDraftIconsWithInvalidName && <Tooltip placement='top' label='Some of icons have invalid name, please fix them before saving.'>
                <Button visuallyDisabled>Save icons</Button>
            </Tooltip>}
            {!hasDraftIconsWithInvalidName && <Button onClick={saveDraftCustomIcons}>Save icons</Button>}
        </motion.div>}

        {draftCustomIcons.length === 0 && <Tooltip label='We support png, jpg, gif and svg and recommend using square images with size between 128 and 256 pixels (not applicable to svg).' maxWidth={500} placement='top'>
            <Button onClick={importCustomIcons}>Import icons</Button>
        </Tooltip>}
    </motion.div>)
};

const FoldersScreen = (props: ComponentProps<typeof motion.div>) => {
    const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();

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
            <Icon icon='ion:add' height={24} /> Create new folder
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

    const { addNewCustomIcon } = useCustomIcons();

    return (<motion.div {...props} className='ImportExportScreen'>
        <div>Here you can backup your settings or restore older backup.</div>
        <div className="import-export-button">
            <Button onClick={importSettings}>Import</Button>
            <Button onClick={exportSettings}>Export</Button>
        </div>
    </motion.div>)
};

const HelpAboutScreen = (props: ComponentProps<typeof motion.div>) => {
    return (<motion.div {...props} className='HelpAboutScreen'>
        <p>
            Anori is free and open source extension. Source code can be found on <a href="https://github.com/OlegWock/anori">GitHub</a>.
            If you would like to propose a feature or report a bug, please
            create <a href="https://github.com/OlegWock/anori/issues/new">new issue</a> in repository.
            If you just want to say thanks you can give a star to that repo :).
        </p>

        <p>
            If you would like to modify this extension, add you own plugin or widget, please refer to <a href="https://github.com/OlegWock/anori">readme</a> for more info.
        </p>

        <p>
            Follow author on <a href="https://twitter.com/OlegWock">Twitter</a> and <a href="https://stand-with-ukraine.pp.ua/">support Ukraine</a>.
        </p>

        <section className='shortcuts-section'>
            <h2>Shortcuts</h2>
            <ShortcutsHelp />
        </section>
    </motion.div>)
};

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
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