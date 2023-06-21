import { MotionValue, animate, useMotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

type AnimationOptions$2<V> = Parameters<typeof animate<V>>[2];

// Source: https://github.com/framer/motion/issues/218#issuecomment-766101845
export const useMotionTransition = <T>(source: MotionValue<T>, { ignoreInitial, ...config }: AnimationOptions$2<T> & { ignoreInitial?: boolean } = {}) => {
    const animatedMotionValue = useMotionValue(source.get());
    const prevValue = useRef<undefined | T>(undefined);
    const animation = useRef<undefined | ReturnType<typeof animate<T>>>(undefined);

    useEffect(() => {
        return source.onChange((newValue: T) => {
            console.log('Prev value is', prevValue, 'new value is', newValue);
            if (prevValue.current === undefined && ignoreInitial) {
                prevValue.current = newValue;
                animatedMotionValue.jump(newValue);
                return;
            }
            animation.current?.stop(); // Don't know if this is needed
            animation.current = animate(animatedMotionValue, newValue, config);
            prevValue.current = newValue;
        });
    }, [animatedMotionValue, config, source]);

    return animatedMotionValue;
};