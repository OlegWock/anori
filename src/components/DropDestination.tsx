import { DndItemMeta, getCurrentDraggable, useCurrentDrop } from "@utils/drag-and-drop";
import { JSXElementConstructor, ReactElement, cloneElement, forwardRef } from "react";
import { mergeRefs } from "react-merge-refs";

type DropDestinationProps = {
    type: string,
    id: string,
    children: ReactElement<any, string | JSXElementConstructor<any>>,
    filter?: string | string[]
    data?: any,
    onDragEnter?: (info: DndItemMeta) => void,
    onDragLeave?: (info: DndItemMeta, reason: 'move' | 'drop') => void,
    onDrop?: (info: DndItemMeta) => void,
};

export const DropDestination = forwardRef<HTMLElement, DropDestinationProps>(({ type, data, filter, children, onDragEnter, onDragLeave, id, onDrop }, ref) => {
    const mergeListeners = (...funcs: ((...args: any[]) => any | undefined)[]) => {
        return (...args: any) => {
            funcs.forEach(f => {
                if (f) f(...args);
            });
        }
    };

    const checkAgainstFilter = (draggable: DndItemMeta | null): draggable is DndItemMeta => {
        if (!draggable) return false;
        if (!filter) return true;
        if (Array.isArray(filter)) return filter.includes(draggable.type);
        return filter === draggable.type;
    };

    const localOnDrop = (draggable: DndItemMeta) => {
        if (onDrop) onDrop(draggable);
        if (onDragLeave) onDragLeave(draggable, 'drop');
    };

    const onPointerEnter = () => {
        const draggable = getCurrentDraggable();
        if (checkAgainstFilter(draggable)) {
            setCurrentDrop({
                type, 
                data, 
                id,
                onDrop: localOnDrop,
            });
            if (onDragEnter) onDragEnter(draggable);
        }
    };
    const onPointerLeave = () => {
        const draggable = getCurrentDraggable();
        if (checkAgainstFilter(draggable)) {
            if (currentDrop?.id === id) setCurrentDrop(null);
            if (onDragLeave) onDragLeave(draggable, 'move');
        }
    };

    const [currentDrop, setCurrentDrop] = useCurrentDrop();

    return cloneElement(children, {
        ...children.props,
        ref: mergeRefs([ref, children.props.ref]),
        onPointerEnter: mergeListeners(onPointerEnter, children.props.onPointerEnter), 
        onPointerLeave: mergeListeners(onPointerLeave, children.props.onPointerLeave),
    });
});