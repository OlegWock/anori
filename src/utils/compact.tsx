import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useBrowserStorageValue } from "./storage/api";
import { useMirrorStateToRef } from "./hooks";
import { IS_TOUCH_DEVICE } from "./device";

const CompactModeContext = createContext(false);

export const applyCompactMode = (isCompact: boolean) => {
    const root = document.documentElement;
    const size = isCompact ? 14 : 16;
    root.style.setProperty('font-size', size + 'px');
    if (isCompact) document.body.classList.add('compact-mode-active');
    else document.body.classList.remove('compact-mode-active');
};

export const useScreenWidth = () => {
    const [screenWidth, setScreenWidth] = useState(() => window.screen.width);
    const screenWidthRef = useMirrorStateToRef(screenWidth);

    useEffect(() => {
        const tid = setInterval(() => {
            // set state seem to take a lot of time in some cases, let's try to avoid it when unnecessary
            if (window.screen.width !== screenWidthRef.current) {
                setScreenWidth(window.screen.width);
            }
        }, 500);

        return () => clearInterval(tid);
    }, []);

    return screenWidth;
};

export const CompactModeProvider = ({ children }: { children: ReactNode }) => {
    const [isAutomaticCompact] = useBrowserStorageValue('automaticCompactMode', !IS_TOUCH_DEVICE);
    const [isManualCompact] = useBrowserStorageValue('compactMode', IS_TOUCH_DEVICE);
    const screenWidth = useScreenWidth();
    const [automaticCompactModeThreshold, setAutomaticCompactModeThreshold] = useBrowserStorageValue('automaticCompactModeThreshold', 1500);
    const isCompact = isAutomaticCompact ? screenWidth < automaticCompactModeThreshold : isManualCompact;

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
        minBlockSize: (isCompact ? 140 : 180) * 0.85,
        gapSize: isCompact ? 8 : 16,
        fontSize: fontSize,
        rem,
    };
};