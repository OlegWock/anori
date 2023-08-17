import { ComponentPropsWithoutRef, useMemo, useRef, useState } from 'react';
import browser from 'webextension-polyfill';
import { useAsyncLayoutEffect, useForceRerender } from '@utils/hooks';
import { asyncIterableToArray, combineRefs } from '@utils/misc';
import { forwardRef } from 'react';
import { useCustomIcon } from '@utils/custom-icons';
import './Icon.scss';
import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { availablePermissionsAtom } from '@utils/permissions';
import { m } from 'framer-motion';
import { allSets } from './icons/all-sets';
import JSZip from 'jszip';

const ICONS_FOLDER_NAME = 'icons';

// @ts-ignore for debug
self.removeAllIconsFromOpfs = async () => {
    const opfsRoot = await navigator.storage.getDirectory();
    const iconsDir = await opfsRoot.getDirectoryHandle(ICONS_FOLDER_NAME, { create: true });
    // @ts-ignore chrome only method
    await iconsDir.remove({ recursive: true });
};

export const unpackIconsIfNeeded = async () => {
    const loadFamily = async (family: string) => {
        const start = performance.now();
        const familyFolder = await iconsDir.getDirectoryHandle(family, { create: true });
        console.log('Loading family', family);
        const resp = await fetch(browser.runtime.getURL(`/assets/icons/${family}.zip`));
        const zip = await JSZip.loadAsync(resp.arrayBuffer());
        const files = Object.values(zip.files);
        for (const f of files) {
            const fileHandle = await familyFolder.getFileHandle(f.name, { create: true });
            const writeHandle = await fileHandle.createWritable();
            const content = await f.async('arraybuffer');
            await writeHandle.write(content);
            await writeHandle.close();
        }
        console.log('Unpacking family', family, 'took', ((performance.now() - start) / 1000).toFixed(4));
        return;
    };

    const start = performance.now();
    const opfsRoot = await navigator.storage.getDirectory();
    const iconsDir = await opfsRoot.getDirectoryHandle(ICONS_FOLDER_NAME, { create: true });
    const files = await asyncIterableToArray(iconsDir.values());
    const subfolders = files.filter(h => h.kind === 'directory').map(h => h.name);
    const setsToCheck = allSets.filter(s => s !== 'custom');
    const allPresent = setsToCheck.every(family => subfolders.find(n => n === family));
    if (allPresent) return;

    for (const family of setsToCheck) {
        await loadFamily(family);
    }
    console.log('Unpacking all icons took', ((performance.now() - start) / 1000).toFixed(4));
};

type BaseIconProps = {
    width?: number | string,
    height?: number | string,
    className?: string,
} & ComponentPropsWithoutRef<typeof m.svg>

export type IconProps = {
    icon: string,
    cache?: boolean,
} & BaseIconProps;

const CustomIcon = forwardRef<SVGSVGElement, IconProps>(({ icon, className, ...props }, ref) => {
    const iconInfo = useCustomIcon(icon);

    if (!iconInfo) {
        // @ts-ignore incorrect ref types?
        return (<div ref={ref} style={{
            background: '#ffffff',
            borderRadius: 8,
            opacity: 0.35,
            width: props.width || props.height || 24,
            height: props.height || props.width || 24,
        }} />);
    }

    // @ts-ignore incorrect ref types?
    return (<m.img className={clsx('CustomIcon', className)} ref={ref} src={iconInfo.urlObject} {...props} />);
});

type IconInfo = {
    viewbox: string,
    aspectRatio: number,
    nodes: Node[],
};

const iconsCache: Map<string, IconInfo | Promise<IconInfo>> = new Map();

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ children, width, height, icon, cache = true, style = {}, ...props }, ref) => {
    const patchSvgRef = (root: SVGSVGElement | null) => {
        if (root && iconRef.current) {
            if (cache) root.replaceChildren(...iconRef.current.nodes.map(n => n.cloneNode(true)));
            else root.replaceChildren(...iconRef.current.nodes);
        }
    };

    const [family, iconName] = icon.split(':');
    const [loaded, setLoaded] = useState(false);
    const forceRerender = useForceRerender();
    const iconRef = useRef<IconInfo | null>(null);
    const rootRef = useRef<SVGSVGElement>(null);
    const mergedRef = combineRefs(patchSvgRef, ref, rootRef);

    useAsyncLayoutEffect(async () => {
        if (family === 'custom') return;

        let iconInfo: IconInfo;
        const fromCache = iconsCache.get(icon);
        if (cache && fromCache) {
            iconInfo = await fromCache;
        } else {
            const start = performance.now();
            const promise = (async () => {
                const opfsRoot = await navigator.storage.getDirectory();
                const iconsDir = await opfsRoot.getDirectoryHandle(ICONS_FOLDER_NAME, { create: true });
                const familyHandle = await iconsDir.getDirectoryHandle(family);
                const iconHandle = await familyHandle.getFileHandle(`${iconName}.svg`);
                const file = await iconHandle.getFile();
                console.log('Icon file handle', (performance.now() - start).toFixed(4), 'ms');
                const svgText = await file.text();
                console.log('Icon read to text in', (performance.now() - start).toFixed(4), 'ms');
                // innerHTML is faster than DOMParser
                // https://www.measurethat.net/Benchmarks/Show/26719/0/domparser-vs-innerhtml-benchmark-for-svg-parsing
                const div = document.createElement('div');
                div.innerHTML = svgText;
                const svgRoot = div.firstChild as SVGSVGElement;
                const nodes = Array.from(svgRoot.childNodes);
                const cachedIcon = {
                    viewbox: svgRoot.getAttribute('viewBox')!,
                    aspectRatio: parseInt(svgRoot.getAttribute('width')!) / parseInt(svgRoot.getAttribute('height')!),
                    nodes,
                } satisfies IconInfo;
                if (cache) iconsCache.set(icon, cachedIcon);
                console.log('Icon loaded in', (performance.now() - start).toFixed(4));
                return cachedIcon;
            })();
            if (cache) iconsCache.set(icon, promise);
            iconInfo = await promise;
        }

        iconRef.current = iconInfo;
        if (rootRef.current) patchSvgRef(rootRef.current);
        setLoaded(true);
        forceRerender();
    }, [icon]);

    if (family === 'custom') {
        return (<CustomIcon {...props} width={width} height={height} style={style} icon={iconName} />);
    }

    if (!loaded) {
        return (<m.div style={{
            background: '#ffffff',
            borderRadius: 8,
            opacity: 0.35,
            width: width || height || 24,
            height: height || width || 24,
        }} />);
    }

    const finalWidth = width || (height ? undefined : '1rem')
    const finalHeight = height || (width ? undefined : '1rem');

    return (<m.svg {...props} style={{ aspectRatio: iconRef.current?.aspectRatio.toString(), ...style }} width={finalWidth} height={finalHeight} viewBox={iconRef.current?.viewbox} ref={mergedRef} />);
});


type FaviconProps = {
    url: string,
    fallback?: string,
    useFaviconApiIfPossible?: boolean,
} & BaseIconProps;

export const Favicon = forwardRef<HTMLElement, FaviconProps>(({ useFaviconApiIfPossible, ...props }, ref) => {
    const permissions = useAtomValue(availablePermissionsAtom);
    const hasPermission = permissions?.permissions.includes('favicon');
    const [imageError, setImageError] = useState(false);

    const iconUrl = useMemo(() => {
        const size = (props.width || props.height || 64).toString();
        if (hasPermission && useFaviconApiIfPossible) {
            const resUrl = new URL(browser.runtime.getURL("/_favicon/"));
            resUrl.searchParams.set("pageUrl", props.url);
            resUrl.searchParams.set("size", size);
            return resUrl.toString();
        } else {
            try {
                const host = new URL(props.url).host;
                return `https://magnificent-orange-damselfly.faviconkit.com/${host}/${size}`;
            } catch (err) {
                console.log('Error parsing host from', props.url);
                return '';
            }
        }
    }, [hasPermission, props.url])



    if (iconUrl && !imageError) {
        // @ts-ignore incorrect ref typing
        return (<img src={iconUrl} onError={() => setImageError(true)} {...props} ref={ref} />);
    }

    // @ts-ignore incorrect ref typing
    return (<Icon icon={props.fallback || 'ic:baseline-tab'} {...props} ref={ref} />);
});