import * as RadixCheckbox from '@radix-ui/react-checkbox';
import './Checkbox.scss';
import { ComponentProps, forwardRef, useId } from 'react';
import { Icon } from './Icon';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { AnimatePresence, m } from 'framer-motion';
import { NarrowVariants } from '@utils/motion/types';

export type CheckboxVariant = 'disabled' | 'checked' | 'unchecked';

export type CheckboxProps = {
    children?: ReactNode,
    defaultChecked?: boolean,
    disabled?: boolean,
    checked?: boolean,
    onChange?: (newState: boolean) => void,
    className?: string,
    variants?: NarrowVariants<CheckboxVariant>,
    transition?: ComponentProps<typeof m.div>["transition"],
    indicatorAnimations?: {
        initial?: ComponentProps<typeof m.div>["initial"],
        animate?: ComponentProps<typeof m.div>["animate"],
        exit?: ComponentProps<typeof m.div>["exit"],
        transition?: ComponentProps<typeof m.div>["transition"],
        style?: ComponentProps<typeof m.div>["style"],
        variants?: NarrowVariants<CheckboxVariant>,
    },
} & Omit<ComponentProps<typeof m.div>, 'onChange'>;

const MotionIndicator = m(RadixCheckbox.Indicator);

export const Checkbox = forwardRef<HTMLDivElement, CheckboxProps>(({ children, defaultChecked, checked, onChange, disabled, className, variants, transition, indicatorAnimations = {}, ...props }, ref) => {
    const getAnimationState = (): CheckboxVariant => {
        if (disabled) return 'disabled';
        if (checked) return 'checked';
        return 'unchecked';
    }

    const id = useId();
    const animate = getAnimationState();
    
    return (<m.div variants={variants} transition={transition} animate={animate} ref={ref} className={clsx('Checkbox', { 'Checkbox-disabled': disabled }, className)} data-disabled={disabled || undefined} {...props}>
        <RadixCheckbox.Root disabled={disabled} className="Checkbox-root" defaultChecked={defaultChecked} id={id} checked={checked} onCheckedChange={onChange}>
            <MotionIndicator forceMount={!!indicatorAnimations} className="Checkbox-indicator">
                <AnimatePresence>
                    {checked && <Icon {...indicatorAnimations} icon="ion:checkmark-sharp" width={14} height={14} />}
                </AnimatePresence>
            </MotionIndicator>
        </RadixCheckbox.Root>
        {!!children && <label className="Label" htmlFor={id}>
            {children}
        </label>}
    </m.div>)
});