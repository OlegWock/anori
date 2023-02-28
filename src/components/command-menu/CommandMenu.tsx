import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import './CommandMenu.scss';
import { Icon } from '@components/Icon';
import { AnoriPlugin, CommandItem } from '@utils/user-data/types';
import { availablePlugins } from '@plugins/all';
import { wait } from '@utils/misc';
import { ScrollArea } from '@components/ScrollArea';

const ON_COMMAND_INPUT_TIMEOUT = 300;

type ActionsWithMetadata = {
    items: CommandItem[],
    plugin: AnoriPlugin<any, any>
};

export const CommandMenu = () => {
    const updateQuery = (val: string) => {
        setQuery(val);
        loadActionsByQuery(val);
    };

    const loadActionsByQuery = async (query: string) => {
        const promises = availablePlugins.filter(p => !!p.onCommandInput).map(p => {
            return Promise.race([
                wait(ON_COMMAND_INPUT_TIMEOUT).then(() => [] as CommandItem[]),
                p.onCommandInput!(query).catch((err) => {
                    console.error('Error in onCommandInput handler of', p);
                    console.error(err);
                    return [] as CommandItem[];
                })
            ]).then(items => {
                return {
                    items,
                    plugin: p,
                } satisfies ActionsWithMetadata;
            });
        });

        const actions = await Promise.all(promises);
        setActions(actions);
    };

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [actions, setActions] = useState<ActionsWithMetadata[]>([]);

    useEffect(() => {
        loadActionsByQuery('');
    }, []);

    useHotkeys('meta+k', () => setOpen((open) => !open), []);

    return (
        <Command.Dialog open={open} onOpenChange={setOpen} label="Global Command Menu" shouldFilter={false}>
            <Command.Input value={query} onValueChange={updateQuery} className='Input' placeholder='Enter command' />
            <Command.List>
                <ScrollArea className='cmdk-scrollarea'>
                    <div className="cmdk-scrollarea-content">
                        {!!query && <Command.Empty>No results found.</Command.Empty>}
                        {!query && <Command.Empty>Nothing here yet. Try adding some widgets to folder.</Command.Empty>}

                        {actions.filter(({ items }) => items.length !== 0).map(({ plugin, items }) => {
                            return (<Command.Group heading={plugin.name} key={plugin.id}>
                                {items.map(({ icon, text, hint, key, onSelected, image }) => {
                                    return (<Command.Item key={key} value={key} onSelect={e => {
                                        setOpen(false);
                                        setQuery('');
                                        onSelected();
                                    }}>
                                        <div cmdk-item-icon="">
                                            {!!icon && <Icon icon={icon} height={24} width={24} />}
                                            {!!image && <img src={image} height={24} />}
                                        </div>
                                        <div cmdk-item-text="">{text}</div>
                                        {!!hint && <div cmdk-item-right-hint="">{hint}</div>}
                                    </Command.Item>);
                                })}
                            </Command.Group>);
                        })}
                    </div>
                </ScrollArea>
            </Command.List>
        </Command.Dialog>
    );
}