import * as RadixCheckbox from '@radix-ui/react-checkbox';
import './Checkbox.scss';
import { forwardRef, useId } from 'react';
import { Icon } from './Icon';
import { ReactNode } from 'react';
import clsx from 'clsx';


type CheckboxProps = {
    children?: ReactNode,
    defaultChecked?: boolean,
    disabled?: boolean,
    checked?: boolean,
    onChange?: (newState: boolean) => void,
    className?: string,
}

export const Checkbox = forwardRef<HTMLDivElement, CheckboxProps>(({ children, defaultChecked, checked, onChange, disabled, className }, ref) => {
    const id = useId();
    return (<div ref={ref} className={clsx('Checkbox', {'Checkbox-disabled': disabled}, className)} data-disabled={disabled || undefined}>
        <RadixCheckbox.Root  disabled={disabled} className="Checkbox-root" defaultChecked={defaultChecked} id={id} checked={checked} onCheckedChange={onChange}>
            <RadixCheckbox.Indicator className="Checkbox-indicator">
                <Icon icon="ion:checkmark-sharp" width={14} height={14} />
            </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        {!!children && <label className="Label" htmlFor={id}>
            {children}
        </label>}
    </div>)
});