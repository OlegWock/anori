import browser from 'webextension-polyfill';
import { useFolders } from '@utils/user-data/hooks';
import './Settings.scss';
import { AnimatePresence, LayoutGroup, Reorder, motion, useDragControls } from 'framer-motion';
import { Button, ButtonProps } from '@components/Button';
import { Icon } from '@components/Icon';
import { AnoriPlugin, Folder, homeFolder } from '@utils/user-data/types';
import { IconPicker } from '@components/IconPicker';
import { Popover } from '@components/Popover';
import { useBrowserStorageValue } from '@utils/storage';
import clsx from 'clsx';
import { Theme, applyTheme, defaultTheme, themes } from '@utils/user-data/theme';
import { availablePlugins } from '@plugins/all';
import { usePluginConfig } from '@utils/plugin';
import { Checkbox } from '@components/Checkbox';
import { Hint } from '@components/Hint';
import { ScrollArea } from '@components/ScrollArea';
import { toCss } from '@utils/color';
import moment from 'moment-timezone';
import { useRef, useState } from 'react';
import { CUSTOM_ICONS_AVAILABLE, getAllCustomIconFiles, isValidCustomIconName, removeAllCustomIcons, useCustomIcons } from '@utils/custom-icons';
import { guid } from '@utils/misc';
import { Input } from '@components/Input';
import { downloadBlob, showOpenFilePicker } from '@utils/files';
import { Tooltip } from '@components/Tooltip';
import JSZip from 'jszip';
import { analyticsEnabledAtom } from '@utils/analytics';
import { useAtom } from 'jotai';


const FolderItem = ({ folder, editable = false, onRemove, onNameChange, onIconChange }: {
    folder: Folder,
    editable?: boolean,
    onNameChange?: (newName: string) => void,
    onIconChange?: (newIcon: string) => void,
    onRemove?: () => void,
}) => {
    const controls = useDragControls();
    const iconSearchRef = useRef<HTMLInputElement>(null);

    const ICON_SIZE = 22;

    if (editable) {
        return (<Reorder.Item
            value={folder}
            dragListener={false}
            dragControls={controls}
            as="div"
            className='FolderItem'
        >
            <Icon className='folder-drag-indicator' icon='ic:baseline-drag-indicator' width={ICON_SIZE} onPointerDown={(e) => {
                e.preventDefault();
                controls.start(e);
            }} />
            <Popover
                component={IconPicker}
                initialFocus={iconSearchRef}
                additionalData={{
                    onSelected: (icon: string) => onIconChange && onIconChange(icon),
                    inputRef: iconSearchRef,
                }}
            >
                <Button className='folder-icon'><Icon icon={folder.icon} width={ICON_SIZE} /></Button>
            </Popover>
            <input
                value={folder.name}
                onChange={e => onNameChange && onNameChange(e.target.value)}
                className='folder-name'
                type="text"
            />
            <Button onClick={() => onRemove && onRemove()}><Icon icon='ion:close' height={ICON_SIZE} /></Button>
        </Reorder.Item>)
    }

    return (<motion.div className='FolderItem'>
        <span style={{ width: ICON_SIZE }} />
        <button className='folder-icon static'><Icon icon={folder.icon} width={ICON_SIZE} /></button>
        <span className='folder-name'>{folder.name}</span>
    </motion.div>)
};

const PlusinConfigurationSection = <T extends {}>({ plugin }: { plugin: AnoriPlugin<T> }) => {
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

type DraftCustomIcon = {
    id: string,
    name: string,
    extension: string,
    content: ArrayBuffer,
    preview: string
};

export const Settings = () => {
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

    const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
    const [currentTheme, setTheme] = useBrowserStorageValue('theme', defaultTheme);
    const [stealFocus, setStealFocus] = useBrowserStorageValue('stealFocus', false);
    const [isAutomaticCompact, setAutomaticCompact] = useBrowserStorageValue('automaticCompactMode', true);
    const [manualCompactMode, setManualCompactMode] = useBrowserStorageValue('compactMode', false);
    const [showLoadAnimation, setShowLoadAnimation] = useBrowserStorageValue('showLoadAnimation', false);
    const [analyticsEnabled, setAnalyticsEnabled] = useAtom(analyticsEnabledAtom);

    const { customIcons, addNewCustomIcon, removeCustomIcon } = useCustomIcons();
    const [draftCustomIcons, setDraftCustomIcons] = useState<DraftCustomIcon[]>([]);
    const hasDraftIconsWithInvalidName = draftCustomIcons.some(i => !isValidCustomIconName(i.name));

    return (<ScrollArea className='Settings'>
        <div className="settings-content">
            The Settings Menu is a powerful tool for customizing your user experience. Here, you can tweak everything from the default color scheme to the order of folders.
            With the Settings Menu, you have total control over the look and feel of your new tab.

            <motion.section layout="position">
                <h2>Analytics</h2>
                <Checkbox checked={analyticsEnabled} onChange={setAnalyticsEnabled}>
                    Enable sending analytics
                    <Hint content={<>
                        Analytics helps me better understand how users interact with Anori and 
                        which features are used the most. I doesn't share any private info like content of 
                        notes or URL of bookmarks.
                        
                        <div style={{marginTop: '0.5rem'}}>This helps me to develop better product so I ask you to enable sending analytics.</div>
                        </>} />
                </Checkbox>
            </motion.section>

            <motion.section layout="position">
                <h2>Options</h2>
                <div className='options-checkboxes'>
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
                </div>
            </motion.section>

            {CUSTOM_ICONS_AVAILABLE && <motion.section layout="position">
                <h2>Custom icons</h2>

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
            </motion.section>}

            <motion.section layout="position">
                <h2>Folders</h2>
                <motion.div className="folders-dnd">
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

                <Button onClick={() => createFolder()}>
                    <Icon icon='ion:add' height={24} /> Create new folder
                </Button>
            </motion.section>

            <motion.section layout="position">
                <h2>Theme</h2>
                <div className="customize-backgrounds">
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
                </div>
            </motion.section>

            {availablePlugins.filter(p => p.configurationScreen !== null).length !== 0 && <motion.section layout="position">
                <h2>Plugin settings</h2>
                {availablePlugins.filter(p => p.configurationScreen !== null).map(p => {
                    return (<PlusinConfigurationSection plugin={p} key={p.id} />);
                })}
            </motion.section>}

            <motion.section layout="position">
                <h2>Import and export</h2>
                <div>Here you can backup your settings or restore older backup.</div>
                <div className="import-export-button">
                    <Button onClick={importSettings}>Import</Button>
                    <Button onClick={exportSettings}>Export</Button>
                </div>
            </motion.section>

            <motion.section layout="position">
                <h2>About Anori</h2>
                <p>
                    Anori is free and open source extension. Source code can be found on <a href="https://github.com/OlegWock/anori">GitHub</a>.
                    If you would like to propose a feature or report a bug, please
                    create <a href="https://github.com/OlegWock/anori/issues/new">new issue</a> in repository.
                    If you just want to say thanks you can give a star to that repo :).
                </p>

                <p>
                    If you would like to modify this extension, add you own plugin or widget, please refer to <a href="https://github.com/OlegWock/anori/blob/master/DEVELOPMENT_AND_EXTENDING.md">documentation</a>.
                </p>

                <p>
                    Follow me on <a href="https://twitter.com/OlegWock">Twitter</a> and <a href="https://stand-with-ukraine.pp.ua/">support Ukraine</a>.
                </p>
            </motion.section>
        </div>
    </ScrollArea>)
};