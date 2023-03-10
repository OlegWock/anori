import { CSSProperties, useMemo, useState } from 'react';
import './IconPicker.scss';
import browser from 'webextension-polyfill';
import { PopoverRenderProps } from './Popover';
import { FixedSizeList } from 'react-window';
import { allSets, iconSetPrettyNames } from './icons/all-sets';
import { Select } from './Select';
import { Input } from './Input';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';

type IconPickerProps = PopoverRenderProps<{
    onSelected: (icon: string) => void,
}>;

const COLUMNS = 8;
const ICON_SIZE = 32;
const PADDING = 10;

const IconCell = ({ icon, onClick }: { icon: string, onClick?: () => void }) => {
    return (
        <Tooltip label={icon} placement='bottom' showDelay={2000} resetDelay={0}>
            <div style={{ padding: PADDING }} className='IconCell' data-icon={icon} onClick={onClick}>
                <Icon icon={icon} width={ICON_SIZE} height={ICON_SIZE} />
            </div>
        </Tooltip>);
};

const IconRow = ({ index, data, style }: { index: number, style: CSSProperties, data: GridItemData }) => {
    const indexStart = index * COLUMNS;
    const indexEnd = Math.min(indexStart + COLUMNS, data.iconsList.length);

    return (<div className='IconRow' style={style}>
        {data.iconsList.slice(indexStart, indexEnd).map((icon) => {
            const iconName = data.familyName + ':' + icon;
            return (<IconCell key={iconName} icon={iconName} onClick={() => data.onSelected(iconName)} />)
        })}
    </div>)
}

type GridItemData = {
    familyName: string,
    iconsList: string[],
    onSelected: (name: string) => void,
}

const iconsBySetAtom = atom<Record<string, string[]> | null>(null);

export const IconPicker = ({ data, close }: IconPickerProps) => {
    const [selectedFamily, setSelectedFamily] = useState(allSets[0]);
    const [query, setQuery] = useState('');
    const [iconsBySet, setIconsBySet] = useAtom(iconsBySetAtom);

    const iconsList = useMemo(() => iconsBySet === null ? [] : iconsBySet[selectedFamily].filter(icon => icon.includes(query.toLowerCase())), [selectedFamily, query, iconsBySet]);

    const ROWS = Math.ceil(iconsList.length / COLUMNS);

    useEffect(() => {
        const load = async () => {
            const url = browser.runtime.getURL(`/assets/icons/meta.json`);
            const resp = await fetch(url);
            const json = await resp.json();
            setIconsBySet(json);
        };
        if (iconsBySet === null) {
            load();
        }
    }, []);

    return (<div className='IconPicker'>
        <section>
            <label>Icons family:</label>
            <Select<string>
                options={allSets}
                value={selectedFamily}
                onChange={setSelectedFamily}
                getOptionKey={o => o}
                getOptionLabel={o => iconSetPrettyNames[o]}
            />
        </section>

        <section>
            <label>Icons: </label>
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search' className='icons-search' />
            <FixedSizeList<GridItemData>
                className="icons-grid"
                height={350}
                itemCount={ROWS}
                itemSize={ICON_SIZE + PADDING * 2}
                width={COLUMNS * (ICON_SIZE + PADDING * 2) + 8} // 8px is for scrollbar
                itemData={{
                    iconsList,
                    onSelected: (icon) => {
                        close();
                        data.onSelected(icon);
                    },
                    familyName: selectedFamily,
                }}
            >
                {IconRow}
            </FixedSizeList>
        </section>

    </div>)
};