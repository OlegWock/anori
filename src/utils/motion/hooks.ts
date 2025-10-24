import { useMirrorStateToRef } from "@anori/utils/hooks";
import { type AnimationOptions, type MotionValue, animate, useMotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

// Source: https://github.com/framer/motion/issues/218#issuecomment-766101845
export const useMotionTransition = <T extends string | number>(
  source: MotionValue<T>,
  { ignoreInitial, ...config }: AnimationOptions & { ignoreInitial?: boolean } = {},
) => {
  const animatedMotionValue = useMotionValue(source.get());
  const prevValue = useRef<undefined | T>(undefined);
  const animation = useRef<undefined | ReturnType<typeof animate<NonNullable<T>>>>(undefined);
  const configRef = useMirrorStateToRef(config);

  useEffect(() => {
    return source.on("change", (newValue: NonNullable<T>) => {
      if (prevValue.current === undefined && ignoreInitial) {
        prevValue.current = newValue;
        animatedMotionValue.jump(newValue);
        return;
      }
      animation.current?.stop(); // Don't know if this is needed
      // @ts-expect-error `animate` has multiple overloads and TS can't pick the right one
      animation.current = animate(animatedMotionValue, newValue, configRef.current);
      prevValue.current = newValue;
    });
  }, [source, ignoreInitial]);

  return animatedMotionValue;
};
