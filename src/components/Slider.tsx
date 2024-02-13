import * as RadixSlider from '@radix-ui/react-slider';
import clsx from 'clsx';
import './Slider.scss';
import { useMemo } from 'react';

type SliderProps = {
    className?: string;
    value: number;
    onChange?: (val: number) => void;
    onCommit?: (val: number) => void;
    max?: number;
    min?: number;
    step?: number;
    disabled?: boolean
}

export const Slider = ({ className, value, onChange, onCommit, ...props }: SliderProps) => {
    const val = useMemo(() => [value], [value]);
    return (<RadixSlider.Root className={clsx("Slider", className)} value={val} onValueChange={(val) => onChange?.(val[0])} onValueCommit={(val) => onCommit?.(val[0])} {...props}>
        <RadixSlider.Track className='SliderTrack'>
            <RadixSlider.Range className='SliderRange' />
        </RadixSlider.Track>
        <RadixSlider.Thumb className='SliderThumb' />
    </RadixSlider.Root>);
};