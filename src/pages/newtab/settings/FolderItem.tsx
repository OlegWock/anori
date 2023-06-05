import { Button } from "@components/Button";
import { Icon } from "@components/Icon";
import { IconPicker } from "@components/IconPicker";
import { Popover } from "@components/Popover";
import { Folder } from "@utils/user-data/types";
import { Reorder, motion, useDragControls } from "framer-motion";
import { useRef } from "react";
import './FolderItem.scss';

export const FolderItem = ({ folder, editable = false, onRemove, onNameChange, onIconChange }: {
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