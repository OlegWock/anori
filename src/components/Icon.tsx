import { ComponentPropsWithoutRef, useMemo, useRef, useState } from 'react';
import browser from 'webextension-polyfill';
import { useAsyncLayoutEffect, useForceRerender } from '@utils/hooks';
import { combineRefs } from '@utils/misc';
import { forwardRef } from 'react';
import { useCustomIcon } from '@utils/custom-icons';
import './Icon.scss';
import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { availablePermissionsAtom } from '@utils/permissions';
import { m } from 'framer-motion';


type BaseIconProps = {
    width?: number | string,
    height?: number | string,
    className?: string,
} & ComponentPropsWithoutRef<typeof m.svg>
// } & ComponentPropsWithoutRef<typeof m.div>

export type IconProps = {
    icon: string,
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

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ children, width, height, icon, style = {}, ...props }, ref) => {
    const patchSvgRef = (root: SVGSVGElement | null) => {
        if (root && iconRef.current) {
            root.replaceChildren(...iconRef.current.nodes);
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

        const icon: IconInfo = await fetch(browser.runtime.getURL(`/assets/icons/${family}/${iconName}.svg`))
            .then(r => r.text())
            .then(svgText => {
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
                };
                return cachedIcon;
            });

        iconRef.current = icon;
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