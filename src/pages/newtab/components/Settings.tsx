import browser from 'webextension-polyfill';
import { useFolders } from '@utils/user-data/hooks';
import './Settings.scss';
import { DragControls, MotionProps, Reorder, motion, useDragControls, useMotionValue } from 'framer-motion';
import { Button, ButtonProps } from '@components/Button';
import { Icon } from '@components/Icon';
import { AnoriPlugin, Folder, homeFolder } from '@utils/user-data/types';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Position, findIndex } from '@utils/find-index';
import { IconPicker } from '@components/IconPicker';
import { Popover } from '@components/Popover';
import { storage, useBrowserStorageValue } from '@utils/storage';
import { setPageBackground } from '@utils/mount';
import clsx from 'clsx';
import { Theme, applyTheme, defaultTheme, themes } from '@utils/user-data/theme';
import { availablePlugins } from '@plugins/all';
import { usePluginConfig } from '@utils/plugin';
import { Checkbox } from '@components/Checkbox';
import { Hint } from '@components/Hint';
import { ScrollArea } from '@components/ScrollArea';

export type SettingsProps = {};


const FolderItem = ({ folder, editable = false, onRemove, onNameChange, onIconChange }: {
    folder: Folder,
    editable?: boolean,
    onNameChange?: (newName: string) => void,
    onIconChange?: (newIcon: string) => void,
    onRemove?: () => void,
}) => {
    const controls = useDragControls();

    const ICON_SIZE = 22;

    if (editable) {
        return (<Reorder.Item
            value={folder}
            dragListener={false}
            dragControls={controls}
            as="div"
            className='FolderItem'
        >
            <Icon icon='ic:baseline-drag-indicator' width={ICON_SIZE} onPointerDown={(e) => controls.start(e)} />
            <Popover
                component={IconPicker}
                additionalData={{
                    onSelected: (icon: string) => onIconChange && onIconChange(icon),
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
    console.log('Render plate', theme);
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
            <div className='color-circle' style={{ backgroundColor: theme.colors.background }} />
            <div className='color-circle' style={{ backgroundColor: theme.colors.text }} />
            <div className='color-circle' style={{ backgroundColor: theme.colors.accent }} />
        </div>
    </Button>);
};

export const Settings = ({ }: SettingsProps) => {
    const exportSettings = async () => {
        const storage = await browser.storage.local.get(null);
        const aElement = document.createElement('a');
        aElement.setAttribute('download', 'anori-backup.json');

        const blob = new Blob([JSON.stringify(storage, null, 4)], {
            type: 'text/plain'
        });
        const href = URL.createObjectURL(blob);
        aElement.href = href;
        aElement.setAttribute('target', '_blank');
        aElement.click();
        URL.revokeObjectURL(href);
    };

    const importSettings = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files![0];
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.addEventListener('load', async (e) => {
                const text = e.target!.result as string;
                const json = JSON.parse(text);

                // TODO: will be a good idea to validate before importing
                await browser.storage.local.set(json);
                window.location.reload();
            });
        });

        input.click();
    };
    const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
    const [currentTheme, setTheme] = useBrowserStorageValue('theme', defaultTheme);
    const [stealFocus, setStealFocus] = useBrowserStorageValue('stealFocus', false);

    return (<ScrollArea className='Settings'>
        <div className="settings-content">
            The Settings Menu is a powerful tool for customizing your user experience. Here, you can tweak everything from the default color scheme to the order of folders.
            With the Settings Menu, you have total control over the look and feel of your new tab.

            <section>
                <h2>Options</h2>
                <div>
                    <Checkbox checked={stealFocus} onChange={setStealFocus}>
                        Steal focus from addressbar
                        <Hint text='If enabled, this will force browser to move focus from address bar to this page when opening new tab and you will be able to use command menu (Cmd+K) without needing to move focus to page manually (by clicking or pressing Tab).' />
                    </Checkbox>
                </div>
            </section>
            <section>
                <h2>Import and export</h2>
                <div>Here you can backup your settings or restore older backup.</div>
                <div className="import-export-button">
                    <Button onClick={importSettings}>Import</Button>
                    <Button onClick={exportSettings}>Export</Button>
                </div>
            </section>
            <section>
                <h2>Folders</h2>
                <div className="folders-dnd">
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
                </div>

                <Button onClick={() => createFolder()}>
                    <Icon icon='ion:add' height={24} /> Create new folder
                </Button>
            </section>

            <section>
                <h2>Theme</h2>
                <div className="customize-backgrounds">
                    {themes.map((theme) => {
                        return (<ThemePlate
                            theme={theme}
                            className={clsx({ 'active': theme.name === currentTheme.name })}
                            onClick={() => {
                                setTheme(theme);
                                applyTheme(theme);
                            }}
                            key={theme.name}
                        />)
                    })}
                </div>
            </section>

            {availablePlugins.filter(p => p.configurationScreen !== null).length !== 0 && <section>
                <h2>Plugin settings</h2>
                {availablePlugins.filter(p => p.configurationScreen !== null).map(p => {
                    return (<PlusinConfigurationSection plugin={p} key={p.id} />);
                })}
            </section>}

            <section>
                <h2>About Anori</h2>
                <p>
                    Anori is free and open source extension. Source code can be found on <a href="https://github.com/OlegWock/anori">GitHub</a>. 
                    If you would like to propose a feature or report a bug, please 
                    create <a href="https://github.com/OlegWock/anori/issues/new">new issue</a> in repository. 
                    If you just want to say thanks you can give a star to that repo :).
                </p>

                <p>
                    If you would like to modify this extension, add you own plugin or widget, please refer to <a href='https://github.com/OlegWock/anori/blob/master/DEVELOPMENT_AND_EXTENDING.md'>documentation</a>.
                </p>
            </section>
        </div>
    </ScrollArea>)
};