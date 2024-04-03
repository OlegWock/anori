import { ChangeEvent, ComponentProps } from 'react';
import './Input.scss';
import { clsx } from 'clsx';
import { forwardRef } from 'react';


export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'> & { onValueChange?: (val: string) => void }>(({ className, onValueChange, onChange, ...props }, ref) => {
    const patchedOnChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (onValueChange) onValueChange(e.target.value);
        if (onChange) return onChange(e);
    };

    return (<input onChange={patchedOnChange} ref={ref} className={clsx(className, 'Input')}  {...props} />)
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'> & { onValueChange?: (val: string) => void }>(({ className, onValueChange, onChange, ...props }, ref) => {
    const patchedOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (onValueChange) onValueChange(e.target.value);
        if (onChange) return onChange(e);
    };

    return (<textarea onChange={patchedOnChange} ref={ref} className={clsx(className, 'Input', 'TextArea')}  {...props} />)
});