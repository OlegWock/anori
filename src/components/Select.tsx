import React, { ReactNode, Suspense, lazy, useLayoutEffect, useState } from 'react';
import type { SelectItemProps } from '@radix-ui/react-select';
import classnames, { clsx } from 'clsx';
import './Select.scss';
import { Icon } from './Icon';
import { useDirection } from '@radix-ui/react-direction';

const RadixSelectRoot = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.Root })));
const RadixSelectTrigger = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectTrigger })));
const RadixSelectValue = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectValue })));
const RadixSelectIcon = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectIcon })));
const RadixSelectContent = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectContent })));
const RadixSelectScrollUpButton = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectScrollUpButton })));
const RadixSelectViewport = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectViewport })));
const RadixSelectScrollDownButton = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectScrollDownButton })));
const RadixSelectItem = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectItem })));
const RadixSelectItemText = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectItemText })));
const RadixSelectItemIndicator = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectItemIndicator })));
const RadixSelectPortal = lazy(() => import('@radix-ui/react-select').then(m => ({ default: m.SelectPortal })));


export type SelectProps<T> = {
    options: T[] | readonly T[],
    getOptionKey: (opt: T) => string,
    getOptionLabel: (opt: T) => ReactNode,
    value: T,
    onChange: (newVal: T) => void,
    placeholder?: string,
    triggerClassname?: string,
    contentClassname?: string,
};

export const Select = <T,>({ options, value, onChange, placeholder = 'Select...', getOptionKey, getOptionLabel, triggerClassname, contentClassname }: SelectProps<T>) => {
    const innerOnChange = (newVal: string) => {
        const option = options.find(o => getOptionKey(o) === newVal);
        if (option === undefined) throw new Error('Value not found in selects options');

        onChange(option);
    };

    const [innerValue, setInnerValue] = useState(getOptionKey(value));
    const dir = useDirection();

    useLayoutEffect(() => {
        setInnerValue(getOptionKey(value));
    }, [value]);

    return (
        <Suspense>
            <RadixSelectRoot value={innerValue} onValueChange={innerOnChange} dir={dir}>
                <RadixSelectTrigger className={clsx("SelectTrigger", triggerClassname)} aria-label={placeholder}>
                    <RadixSelectValue placeholder={placeholder} />
                    <RadixSelectIcon className="SelectIcon">
                        <Icon icon="ion:chevron-down" />
                    </RadixSelectIcon>
                </RadixSelectTrigger>
                <RadixSelectPortal>
                    <RadixSelectContent className={clsx("SelectContent", contentClassname)}>
                        <RadixSelectScrollUpButton className="SelectScrollButton">
                            <Icon icon="ion:chevron-up" />
                        </RadixSelectScrollUpButton>
                        <RadixSelectViewport className="SelectViewport">
                            {options.map(o => {
                                const key = getOptionKey(o);
                                return (<SelectItem value={key} key={key}>{getOptionLabel(o)}</SelectItem>);
                            })}
                        </RadixSelectViewport>
                        <RadixSelectScrollDownButton className="SelectScrollButton">
                            <Icon icon="ion:chevron-down" />
                        </RadixSelectScrollDownButton>
                    </RadixSelectContent>
                </RadixSelectPortal>
            </RadixSelectRoot>
        </Suspense>
    );
};


const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(({ children, className, ...props }, forwardedRef) => {
    return (
        <RadixSelectItem className={classnames('SelectItem', className)} {...props} ref={forwardedRef}>
            <RadixSelectItemText>{children}</RadixSelectItemText>
            <RadixSelectItemIndicator className="SelectItemIndicator">
                <Icon icon='ion:checkmark' />
            </RadixSelectItemIndicator>
        </RadixSelectItem>
    );
});