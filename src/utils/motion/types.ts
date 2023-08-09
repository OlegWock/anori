import { AnimationPlaybackControls, Variant, animate } from "framer-motion";


export type AnimateFunction<V> = typeof animate<V>;
export type AnimationOptions<V> = Parameters<AnimateFunction<V>>;

export type BetterAnimationPlaybackControls = Omit<AnimationPlaybackControls, 'then'> & {
    then: (onResolve: (details: { reason: 'finished' | 'canceled' }) => void, onReject?: VoidFunction) => Promise<void>;
};

export type NarrowVariants<T extends string> = {
    [key in T]?: Variant;
};