import * as RadixCheckbox from '@radix-ui/react-checkbox';
import './Checkbox.scss';
import { useId } from 'react';
import { Icon } from './Icon';
import { ReactNode } from 'react';


type CheckboxProps = {
    children?: ReactNode,
    defaultChecked?: boolean,
    checked?: boolean,
    onChange?: (newState: boolean) => void,
}

export const Checkbox = ({ children, defaultChecked, checked, onChange }: CheckboxProps) => {
    const id = useId();
    return (<div className='Checkbox'>
        <RadixCheckbox.Root className="Checkbox-root" defaultChecked={defaultChecked} id={id} checked={checked} onCheckedChange={onChange}>
            <RadixCheckbox.Indicator className="Checkbox-indicator">
                <Icon icon="ion:checkmark-sharp" width={14} height={14} />
            </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        {!!children && <label className="Label" htmlFor={id}>
            {children}
        </label>}
    </div>)
};