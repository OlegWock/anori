import { MouseEvent, ReactNode } from 'react';
import './Hint.scss';
import { Icon, IconProps } from './Icon';
import { Tooltip } from './Tooltip';
import clsx from 'clsx';

export const Hint = ({ content, className, hasClickableContent, ...props }: { content: ReactNode, hasClickableContent?: boolean } & Omit<IconProps, 'icon' | 'ref'>) => {
    const preventPropagation = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
    }
    return (<Tooltip label={content} maxWidth={400} hasClickableContent={hasClickableContent} enableOnTouch>
        <Icon
            icon='ion:help-circle'
            className={clsx('Hint', className)}
            height={20}
            onClick={preventPropagation} onMouseDown={preventPropagation} onMouseUp={preventPropagation} onPointerDown={preventPropagation} onPointerUp={preventPropagation}
            {...props}
        />
    </Tooltip>);
};