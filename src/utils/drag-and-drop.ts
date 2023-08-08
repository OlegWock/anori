import { PanInfo, TargetAndTransition, useDragControls } from "framer-motion";
import { atom, getDefaultStore, useAtom, useStore } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useMirrorStateToRef } from "./hooks";

export type DndItemMeta<T extends string = string> = {
    type: T,
    id: string,
    data?: any,
};

export type DropDestinationMeta = DndItemMeta & {
    onDrop: (info: DndItemMeta) => void,
}

export const ensureDndItemType = <T extends string>(dndItem: DndItemMeta, type: T): dndItem is DndItemMeta<T> => {
    return dndItem.type === type;
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
        console.log('Registering drag for', info.id);
        isDragActiveRef.current = true;
        setCurrentDraggable(info);
        setCurrentDrop(null);
    };
    const endDrag = () => {
        console.log('Inner endDrag');
        isDragActiveRef.current = false;
        if (currentDropRef.current) {
            console.log('Item', info, 'dropped onto', currentDropRef.current);
            currentDropRef.current.onDrop(info);
        }
        console.log('Current draggable id', currentDraggable?.id, 'id of item that called this hook', info.id);
        if (currentDraggableRef.current?.id === info.id) {
            setCurrentDraggable(null);
            setCurrentDrop(null);
        }

        return currentDropRef.current;
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
    const currentDraggableRef = useMirrorStateToRef(currentDraggable);
    const [currentDrop, setCurrentDrop] = useAtom(currentDropDestinationAtom);
    const currentDropRef = useMirrorStateToRef(currentDrop);


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

export const useCurrentlyDragging = (filter?: { type: string | string[] }) => {
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