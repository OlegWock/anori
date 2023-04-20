import './Hint.scss';
import { Icon, IconProps } from './Icon';
import { Tooltip } from './Tooltip';
import clsx from 'clsx';

export const Hint = ({text, className, ...props}: {text: string} & Omit<IconProps, 'icon' | 'ref'>) => {
    return (<Tooltip label={text} maxWidth={400}>
        <Icon icon='ion:help-circle' className={clsx('Hint', className)} height={20} {...props}/>
    </Tooltip>);
};