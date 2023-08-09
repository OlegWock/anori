import { MotionValue, animate, useAnimate, useMotionValue } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { AnimateFunction, AnimationOptions, BetterAnimationPlaybackControls } from "./types";

type AnimationOptions$2<V> = AnimationOptions<V>[2];

// Source: https://github.com/framer/motion/issues/218#issuecomment-766101845
export const useMotionTransition = <T>(source: MotionValue<T>, { ignoreInitial, ...config }: AnimationOptions$2<T> & { ignoreInitial?: boolean } = {}) => {
    const animatedMotionValue = useMotionValue(source.get());
    const prevValue = useRef<undefined | T>(undefined);
    const animation = useRef<undefined | ReturnType<typeof animate<T>>>(undefined);

    useEffect(() => {
        return source.on('change', (newValue: T) => {
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

export const useCancelableAnimate = () => {
    const patchAnimate = <V>(animate: AnimateFunction<V>) => {
        const patched = (...args: AnimationOptions<V>) => {
            let canceled = false;
            const controls = animate(...args);

            return {
                ...controls,
                stop: () => {
                    canceled = true;
                    return controls.stop();
                },
                cancel: () => {
                    canceled = true;
                    return controls.cancel();
                },
                then: (onResolve, onReject) => {
                    return controls.then(() => {
                        if (canceled) {
                            onResolve({reason: 'canceled'});
                        } else {
                            onResolve({reason: 'finished'});
                        }
                    }, onReject);
                },
            } satisfies BetterAnimationPlaybackControls;
        };

        return patched;
    };
    // Can be removed once this PR gets merged https://github.com/framer/motion/pull/2285
    const [scope, animate] = useAnimate();

    const patchedAnimate = useMemo(() => patchAnimate(animate), [animate]);

    return [scope, patchedAnimate] as const;
};