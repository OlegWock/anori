import { ComponentProps } from 'react';
import './Input.scss';
import { clsx } from 'clsx';


export const Input = ({className, ...props}: ComponentProps<'input'>) => {
    return (<input className={clsx(className, 'Input')}  {...props} />)
};