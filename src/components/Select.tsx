import React, { ReactNode, useLayoutEffect, useState } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import classnames, { clsx } from 'clsx';
import './Select.scss';
import { Icon } from './Icon';


export type SelectProps<T> = {
    options: T[],
    getOptionKey: (opt: T) => string,
    getOptionLabel: (opt: T) => ReactNode,
    value: T,
    onChange: (newVal: T) => void,
    placeholder?: string,
};

export const Select = <T,>({ options, value, onChange, placeholder = 'Select...', getOptionKey, getOptionLabel }: SelectProps<T>) => {
    const innerOnChange = (newVal: string) => {
        const option = options.find(o => getOptionKey(o) === newVal);
        if (!option) throw new Error('Value not found in selects options');

        onChange(option);
    };

    const [innerValue, setInnerValue] = useState(getOptionKey(value));

    useLayoutEffect(() => {
        setInnerValue(getOptionKey(value));
    }, [value]);

    return (
        <RadixSelect.Root value={innerValue} onValueChange={innerOnChange}>
            <RadixSelect.Trigger className="SelectTrigger" aria-label={placeholder}>
                <RadixSelect.Value placeholder={placeholder} />
                <RadixSelect.Icon className="SelectIcon">
                    <Icon icon="ion:chevron-down" />
                </RadixSelect.Icon>
            </RadixSelect.Trigger>
            <RadixSelect.Portal>
                <RadixSelect.Content className={clsx("SelectContent")}>
                    <RadixSelect.ScrollUpButton className="SelectScrollButton">
                        <Icon icon="ion:chevron-up" />
                    </RadixSelect.ScrollUpButton>
                    <RadixSelect.Viewport className="SelectViewport">
                        {options.map(o => {
                            const key = getOptionKey(o);
                            return (<SelectItem value={key} key={key}>{getOptionLabel(o)}</SelectItem>);
                        })}
                    </RadixSelect.Viewport>
                    <RadixSelect.ScrollDownButton className="SelectScrollButton">
                        <Icon icon="ion:chevron-down" />
                    </RadixSelect.ScrollDownButton>
                </RadixSelect.Content>
            </RadixSelect.Portal>
        </RadixSelect.Root>
    );
};


const SelectItem = React.forwardRef<HTMLDivElement, RadixSelect.SelectItemProps>(({ children, className, ...props }, forwardedRef) => {
    return (
        <RadixSelect.Item className={classnames('SelectItem', className)} {...props} ref={forwardedRef}>
            <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
            <RadixSelect.ItemIndicator className="SelectItemIndicator">
                <Icon icon='ion:checkmark' />
            </RadixSelect.ItemIndicator>
        </RadixSelect.Item>
    );
});