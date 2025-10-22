import { useLazyRef } from "@anori/utils/hooks";
import { MotionValue, frame } from "framer-motion";

const getCurrentDerivedValue = <I, V>(deps: MotionValue[], depsTransformer: (deps: I[]) => V) => {
  const newVal = depsTransformer(deps.map((d) => d.get()));
  return newVal;
};

export class DerivedMotionValue<I, O> extends MotionValue<O> {
  private deps: MotionValue[];
  private depsTransformer: (deps: unknown[]) => O;

  constructor(deps: MotionValue<I>[], transformer: (deps: I[]) => O) {
    const val = getCurrentDerivedValue(deps, transformer);
    super(val);
    this.deps = [...deps];
    this.depsTransformer = transformer;
    this.deps.forEach((d) => d.on("change", this.deriveCurrentValue));
    this.deriveCurrentValue();
  }

  deriveFrom<T>(deps: MotionValue<T>[], transformer: (deps: T[]) => O) {
    this.detach();
    this.deps = [...deps];
    this.depsTransformer = transformer;
    this.deps.forEach((d) => d.on("change", this.deriveCurrentValue));
    this.deriveCurrentValue();
  }

  detach() {
    if (!this.deps || !this.depsTransformer) return;
  }

  private deriveCurrentValue = () => {
    if (!this.deps || !this.depsTransformer) {
      console.warn("Deps or transformer missing on derived motion value");
      return;
    }
    frame.update(() => {
      const newVal = getCurrentDerivedValue(this.deps, this.depsTransformer);
      super.set(newVal);
    });
  };

  destroy(): void {
    super.destroy();
    this.detach();
  }

  set(_v: O, _render?: boolean | undefined): void {
    return;
  }

  jump(_v: O): void {
    return;
  }
}

export function useDerivedMotionValue<I, O>(
  value: MotionValue<I>,
  transformer: (val: I) => O,
): DerivedMotionValue<I, O>;
export function useDerivedMotionValue<I, O>(
  values: MotionValue<I>[],
  transformer: (val: I[]) => O,
): DerivedMotionValue<I, O>;
export function useDerivedMotionValue<I, O>(
  values: MotionValue<I> | MotionValue<I>[],
  transformer: (val: I | I[]) => O,
): DerivedMotionValue<I, O> {
  if (!Array.isArray(values)) {
    values = [values];
    const origTransformer = transformer as (val: I) => O;
    transformer = (vals: I[]) => origTransformer(vals[0]);
  }

  const value = useLazyRef(() => new DerivedMotionValue(values as MotionValue<I>[], transformer));

  return value.current;
}
