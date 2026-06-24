import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { NarrowVariants } from "@anori/utils/motion/types";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { type ComponentProps, useId } from "react";
import { css, cx } from "styled-system/css";

const wrapper = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  "&:not([data-disabled]) button, &:not([data-disabled]) label": { cursor: "pointer" },
  "&[data-disabled]": {
    color: "text.disabled",
    "& button, & label": { cursor: "not-allowed" },
  },
});
const root = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  minWidth: "20px",
  minHeight: "20px",
  borderRadius: "xs",
  bg: "control",
  boxShadow: "control.edge",
});
const indicator = css({ display: "flex" });
const label = css({ margin: 0, display: "flex", alignItems: "center", fontWeight: "regular", lineHeight: "normal" });

export type CheckboxVariant = "disabled" | "checked" | "unchecked";

export type CheckboxProps = {
  children?: ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (newState: boolean) => void;
  className?: string;
  variants?: NarrowVariants<CheckboxVariant>;
  transition?: ComponentProps<typeof m.div>["transition"];
  indicatorAnimations?: {
    initial?: ComponentProps<typeof m.div>["initial"];
    animate?: ComponentProps<typeof m.div>["animate"];
    exit?: ComponentProps<typeof m.div>["exit"];
    transition?: ComponentProps<typeof m.div>["transition"];
    style?: ComponentProps<typeof m.div>["style"];
    variants?: NarrowVariants<CheckboxVariant>;
  };
} & Omit<ComponentProps<typeof m.div>, "onChange">;

const MotionIndicator = m.create(RadixCheckbox.Indicator);

export const Checkbox = ({
  children,
  defaultChecked,
  checked,
  onChange,
  disabled,
  className,
  variants,
  transition,
  indicatorAnimations = {},
  ref,
  ...props
}: CheckboxProps) => {
  const getAnimationState = (): CheckboxVariant => {
    if (disabled) return "disabled";
    if (checked) return "checked";
    return "unchecked";
  };

  const id = useId();
  const animate = getAnimationState();

  return (
    <m.div
      variants={variants}
      transition={transition}
      animate={animate}
      ref={ref}
      className={cx(wrapper, className)}
      data-disabled={disabled || undefined}
      {...props}
    >
      <RadixCheckbox.Root
        disabled={disabled}
        className={root}
        defaultChecked={defaultChecked}
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      >
        <MotionIndicator forceMount={!!indicatorAnimations} className={indicator}>
          <AnimatePresence>
            {checked && <Icon {...indicatorAnimations} icon={builtinIcons.checkSharp} width={14} height={14} />}
          </AnimatePresence>
        </MotionIndicator>
      </RadixCheckbox.Root>
      {!!children && (
        <label className={label} htmlFor={id}>
          {children}
        </label>
      )}
    </m.div>
  );
};
