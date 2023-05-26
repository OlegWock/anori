import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useBrowserStorageValue } from "./storage";
import { useMirrorStateToRef } from "./hooks";

const CompactModeContext = createContext(false);

export const applyCompactMode = (isCompact: boolean) => {
    const root = document.documentElement;
    const size = isCompact ? 14 : 16;
    root.style.setProperty('font-size', size + 'px');
};

export const CompactModeProvider = ({children}: {children: ReactNode}) => {
    const [isAutomaticCompact] = useBrowserStorageValue('automaticCompactMode', true);
    const [isManualCompact] = useBrowserStorageValue('compactMode', false);
    const [screenWidth, setScreenWidth] = useState(() => window.screen.width);
    const screenWidthRef = useMirrorStateToRef(screenWidth);
    const isCompact = isAutomaticCompact ? screenWidth < 1500 : isManualCompact;

    useEffect(() => {
        const tid = setInterval(() => {
            // set state seem to take a lot of time in some cases, let's try to avoid it when unnecessary
            if (window.screen.width !== screenWidthRef.current) {
                setScreenWidth(window.screen.width);
            }
        }, 50);

        return () => clearInterval(tid);
    }, []);

    useEffect(() => {
        applyCompactMode(isCompact);
    }, [isCompact]);

    return (<CompactModeContext.Provider value={isCompact}>
        {children}
    </CompactModeContext.Provider>);
};

export const useSizeSettings = () => {
    const isCompact = useContext(CompactModeContext);
    const fontSize = isCompact ? 14 : 16;
    const rem = (n: number) => fontSize * n;

    return {
        isCompact,
        blockSize: isCompact ? 140 : 180,
        gapSize: isCompact ? 8 : 16,
        fontSize: fontSize,
        rem,
    };
};