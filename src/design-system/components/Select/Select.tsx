import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useDirection } from "@radix-ui/react-direction";
import type { SelectItemProps } from "@radix-ui/react-select";
import {
  SelectContent as RadixSelectContent,
  SelectIcon as RadixSelectIcon,
  SelectItem as RadixSelectItem,
  SelectItemIndicator as RadixSelectItemIndicator,
  SelectItemText as RadixSelectItemText,
  SelectPortal as RadixSelectPortal,
  Root as RadixSelectRoot,
  SelectScrollDownButton as RadixSelectScrollDownButton,
  SelectScrollUpButton as RadixSelectScrollUpButton,
  SelectTrigger as RadixSelectTrigger,
  SelectValue as RadixSelectValue,
  SelectViewport as RadixSelectViewport,
} from "@radix-ui/react-select";
import { clsx } from "clsx";
import React, { type ReactNode, useLayoutEffect, useState } from "react";
import { css } from "styled-system/css";

const trigger = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: "md",
  px: "4",
  gap: "3",
  height: "36px",
  minWidth: "250px",
  border: "none",
  fontSize: "sm",
  lineHeight: "none",
  color: "text.primary",
  bg: "control",
  cursor: "pointer",
  "&[data-placeholder]": { color: "text.placeholder" },
  _focusVisible: { outlineWidth: "2px", outlineStyle: "solid", outlineColor: "accent" },
});
const triggerIcon = css({ color: "text.subtle" });
// Portaled dropdown — needs to sit above modals it may be opened from, hence the high z layer.
const content = css({
  overflow: "hidden",
  bg: "control",
  borderRadius: "sm",
  boxShadow: "popover",
  zIndex: "tooltip",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "accent",
});
const viewport = css({ padding: "1-5" });
const item = css({
  display: "flex",
  alignItems: "center",
  position: "relative",
  height: "1.5625rem",
  paddingLeft: "6",
  paddingRight: "9",
  borderRadius: "xs",
  fontSize: "xs",
  lineHeight: "none",
  color: "text.primary",
  cursor: "pointer",
  userSelect: "none",
  "&[data-disabled]": { color: "text.disabled", pointerEvents: "none" },
  "&[data-highlighted]": { outline: "none", bg: "accent", color: "on-accent" },
});
const itemIndicator = css({
  position: "absolute",
  left: 0,
  width: "25px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});
const scrollButton = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "25px",
  bg: "control",
  cursor: "default",
});

export type SelectProps<T> = {
  options: T[] | readonly T[];
  getOptionKey: (opt: T) => string;
  getOptionLabel: (opt: T) => ReactNode;
  value: T;
  onChange: (newVal: T) => void;
  placeholder?: string;
  triggerClassname?: string;
  contentClassname?: string;
};

export const Select = <T,>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  getOptionKey,
  getOptionLabel,
  triggerClassname,
  contentClassname,
}: SelectProps<T>) => {
  const innerOnChange = (newVal: string) => {
    const option = options.find((o) => getOptionKey(o) === newVal);
    if (option === undefined) throw new Error("Value not found in selects options");

    onChange(option);
  };

  const [innerValue, setInnerValue] = useState(getOptionKey(value));
  const dir = useDirection();

  // biome-ignore lint/correctness/useExhaustiveDependencies: getOptionKey is allowed to be dynamic for convenience, but we don't want to reset input value on its every change
  useLayoutEffect(() => {
    setInnerValue(getOptionKey(value));
  }, [value]);

  return (
    <RadixSelectRoot value={innerValue} onValueChange={innerOnChange} dir={dir}>
      <RadixSelectTrigger className={clsx(trigger, "SelectTrigger", triggerClassname)} aria-label={placeholder}>
        <RadixSelectValue placeholder={placeholder} />
        <RadixSelectIcon className={triggerIcon}>
          <Icon icon={builtinIcons.chevronDown} />
        </RadixSelectIcon>
      </RadixSelectTrigger>
      <RadixSelectPortal>
        <RadixSelectContent className={clsx(content, "SelectContent", contentClassname)}>
          <RadixSelectScrollUpButton className={scrollButton}>
            <Icon icon={builtinIcons.chevronUp} />
          </RadixSelectScrollUpButton>
          <RadixSelectViewport className={viewport}>
            {options.map((o) => {
              const key = getOptionKey(o);
              return (
                <SelectItem value={key} key={key}>
                  {getOptionLabel(o)}
                </SelectItem>
              );
            })}
          </RadixSelectViewport>
          <RadixSelectScrollDownButton className={scrollButton}>
            <Icon icon={builtinIcons.chevronDown} />
          </RadixSelectScrollDownButton>
        </RadixSelectContent>
      </RadixSelectPortal>
    </RadixSelectRoot>
  );
};

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children, className, ...props }, forwardedRef) => {
    return (
      <RadixSelectItem className={clsx(item, "SelectItem", className)} {...props} ref={forwardedRef}>
        <RadixSelectItemText>{children}</RadixSelectItemText>
        <RadixSelectItemIndicator className={itemIndicator}>
          <Icon icon={builtinIcons.check} />
        </RadixSelectItemIndicator>
      </RadixSelectItem>
    );
  },
);
