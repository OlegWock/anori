import browser from 'webextension-polyfill';
import { useFolders } from '@utils/user-data/hooks';
import './Settings.scss';
import { DragControls, MotionProps, Reorder, motion, useDragControls, useMotionValue } from 'framer-motion';
import { Button, ButtonProps } from '@components/Button';
import { Icon } from '@components/Icon';
import { AodakePlugin, Folder, homeFolder } from '@utils/user-data/types';
import { useEffect, useRef, useState } from 'react';
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
                <button className='folder-icon'><Icon icon={folder.icon} width={ICON_SIZE} /></button>
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
        <button className='folder-icon'><Icon icon={folder.icon} width={ICON_SIZE} /></button>
        <span className='folder-name'>{folder.name}</span>
    </motion.div>)
};

const PlusinConfigurationSection = <T extends {}>({ plugin }: { plugin: AodakePlugin<T> }) => {
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
    const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
    const [currentTheme, setTheme] = useBrowserStorageValue('theme', defaultTheme);
    const [stealFocus, setStealFocus] = useBrowserStorageValue('stealFocus', false);

    return (<div className='Settings'>
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

        <section>
            <h2>Plugin settings</h2>
            {availablePlugins.filter(p => p.configurationScreen !== null).map(p => {
                return (<PlusinConfigurationSection plugin={p} key={p.id} />);
            })}
        </section>
    </div>)
};