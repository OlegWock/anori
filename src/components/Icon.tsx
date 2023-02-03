import { useEffect, useLayoutEffect } from 'react';
import browser from 'webextension-polyfill';
import { allSets } from './icons/all-sets';
import { IconifyJSON, Icon as OfflineIcon, addCollection } from '@iconify/react/dist/offline';
import { useForceRerender } from '@utils/hooks';
import { guid } from '@utils/misc';


const isFamilyLoaded = (family: string) => {
    return loadedFamilies.includes(family);
};

const loadFamily = async (family: string) => {
    const url = browser.runtime.getURL(`/assets/icons/${family}.json`);
    const resp = await fetch(url);
    const json = await resp.json() as IconifyJSON;
    addCollection(json);
};

export const requestIconsFamily = async (family: string) => {
    if (!allSets.includes(family)) {
        console.error(`Unknown icons family ${family}, please make sure it's included in generate-icons script in root of project and run that script to regenerate icons.`);
        return;
    }

    if (loadingPromises[family] || isFamilyLoaded(family)) return;

    const promise = loadFamily(family);
    loadingPromises[family] = promise;
    await promise;
    loadingPromises[family] = undefined;
    loadedFamilies.push(family);

    Object.values(familyLoadedCallbacks).forEach(cb => cb(family));
};

const subscribeToLoadEvents = (cb: (family: string) => void): string => {
    const callbackId = guid();
    familyLoadedCallbacks[callbackId] = cb;
    return callbackId;
};

const unsubscribe = (callbackId: string) => {
    delete familyLoadedCallbacks[callbackId];
};

const loadedFamilies: string[] = [];
let loadingPromises: Record<string, Promise<void> | undefined> = {};
const familyLoadedCallbacks: Record<string, (family: string) => void> = {};



export const Icon = (props: Omit<React.ComponentProps<typeof OfflineIcon>, 'icon'> & { icon: string }) => {
    useLayoutEffect(() => {
        const family = props.icon.split(':')[0];
        if (!family || isFamilyLoaded(family)) return;

        const callbackId = subscribeToLoadEvents((loadedFamily) => {
            if (loadedFamily === family) {
                unsubscribe(callbackId);
                rerender();
            }
        });

        requestIconsFamily(family);
        return () => unsubscribe(callbackId);
    }, [props.icon]);

    const rerender = useForceRerender();
    return (<OfflineIcon {...props}>
        <div style={{
            background: '#ffffff',
            borderRadius: 8,
            opacity: 0.35,
            width: props.width || props.height || 24,
            height: props.height || props.width || 24,
        }} />
    </OfflineIcon>);
};