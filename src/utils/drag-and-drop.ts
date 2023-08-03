import { PanInfo, TargetAndTransition, useDragControls } from "framer-motion";
import { atom, getDefaultStore, useAtom, useStore } from "jotai";
import { useEffect, useRef, useState } from "react";

export type DndItemMeta = {
    type: string,
    id: string,
    data?: any,
};

export type DropDestinationMeta = DndItemMeta & {
    onDrop: (info: DndItemMeta) => void,
}

const currentDraggableAtom = atom<DndItemMeta | null>(null);
const currentDropDestinationAtom = atom<DropDestinationMeta | null>(null);

type UseDraggableOptions = {
    onDragStart?: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void,
    onDrag?: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void,
    onDragEnd?: (foundDestination: DndItemMeta | null, e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void,
    whileDrag?: TargetAndTransition
};

export const useDraggable = (info: DndItemMeta, options?: UseDraggableOptions) => {
    const registerDrag = () => {
        isDragActiveRef.current = true;
        setCurrentDraggable(info);
        setCurrentDrop(null);
    };
    const endDrag = () => {
        isDragActiveRef.current = false;
        if (currentDrop) {
            console.log('Item', info, 'dropped onto', currentDrop);
            currentDrop.onDrop(info);
        }

        if (currentDraggable?.id === info.id) {
            setCurrentDraggable(null);
            setCurrentDrop(null);
        }

        return currentDrop;
    };

    const onDragStart = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        registerDrag();
        if (options && options.onDragStart) options.onDragStart(e, info);
    };

    const onDrag = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (options && options.onDrag) options.onDrag(e, info);
    };

    const onDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const destination = endDrag();
        if (options && options.onDragEnd) options.onDragEnd(destination, e, info);
    };

    const dragControls = useDragControls();
    const isDragActiveRef = useRef(false);
    const [currentDraggable, setCurrentDraggable] = useAtom(currentDraggableAtom);
    const [currentDrop, setCurrentDrop] = useAtom(currentDropDestinationAtom);


    return {
        dragControls,
        elementProps: {
            onDragStart,
            onDrag,
            onDragEnd,
            dragListener: false,
            dragControls,
            whileDrag: {
                pointerEvents: 'none' as const,
                ...(options?.whileDrag ?? {})
            }
        },
        dragHandleProps: {

        }
    }
};

export const useCurrentlyDragging = (filter?: { type: string | string[]}) => {
    const store = useStore();
    const [dragging, setDragging] = useState(false);
    
    useEffect(() => {
        return store.sub(currentDraggableAtom, () => {
            const curValue = store.get(currentDraggableAtom);
            let matchesFilters = false;
            if (curValue) {
                if (filter) {
                    if (Array.isArray(filter.type)) {
                        matchesFilters = filter.type.includes(curValue.type);
                    } else {
                        matchesFilters = filter.type === curValue.type;
                    }
                } else {
                    matchesFilters = true;
                }
            }

            if (dragging && !matchesFilters) {
                setDragging(false);
            }
            if (!dragging && matchesFilters) {
                setDragging(true);
            }
        });
    }, [filter?.type, store, dragging])

    return dragging;
};

export const useCurrentDrop = () => {
    return useAtom(currentDropDestinationAtom);
};

export const getCurrentDraggable = () => {
    return getDefaultStore().get(currentDraggableAtom);
};