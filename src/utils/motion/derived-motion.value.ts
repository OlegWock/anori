import { useLazyRef } from "@utils/hooks";
import { MotionValue, frame } from "framer-motion";

const getCurrentDerivedValue = <I, V>(deps: MotionValue<any>[], depsTransformer: (deps: I[]) => V) => {
    const newVal = depsTransformer(deps.map(d => d.get()));
    return newVal;
}

export class DerivedMotionValue<I = any, V = any> extends MotionValue<V> {
    private deps: MotionValue<any>[];
    private depsTransformer: (deps: any[]) => V;

    constructor(deps: MotionValue<I>[], transformer: (deps: I[]) => V) {
        const val = getCurrentDerivedValue(deps, transformer);
        // @ts-ignore framer motion doesnt expose constructor in provided types
        super(val);
        this.deps = [...deps];
        this.depsTransformer = transformer;
        this.deps.forEach(d => d.on('change', this.deriveCurrentValue));
        this.deriveCurrentValue();
    }

    deriveFrom<T>(deps: MotionValue<T>[], transformer: (deps: T[]) => V) {
        this.detach();
        this.deps = [...deps];
        this.depsTransformer = transformer;
        this.deps.forEach(d => d.on('change', this.deriveCurrentValue));
        this.deriveCurrentValue();
    }

    detach() {
        if (!this.deps || !this.depsTransformer) return;
    }

    private deriveCurrentValue = () => {
        if (!this.deps || !this.depsTransformer) {
            console.warn('Deps or transformer missing on derived motion value');
            return;
        }
        frame.update(() => {
            const newVal = getCurrentDerivedValue(this.deps, this.depsTransformer);
            super.set(newVal);
        });
    }

    destroy(): void {
        super.destroy();
        this.detach();
    }

    set(v: V, render?: boolean | undefined): void {
        return;
    }

    jump(v: V): void {
        return;
    }
}

export function useDerivedMotionValue<I, O>(value: MotionValue<I>, transformer: (val: I) => O): DerivedMotionValue<O>;
export function useDerivedMotionValue<I, O>(values: MotionValue<I>[], transformer: (val: I[]) => O): DerivedMotionValue<O>;
export function useDerivedMotionValue<I, O>(values: MotionValue<I> | MotionValue<I>[], transformer: (val: I | I[]) => O): DerivedMotionValue<O> {
    if (!Array.isArray(values)) {
        values = [values];
        const origTransformer = transformer as (val: I) => O;
        transformer = (vals: I[]) => origTransformer(vals[0]);
    }

    const value = useLazyRef(() => new DerivedMotionValue(values as MotionValue<I>[], transformer));

    return value.current;
}