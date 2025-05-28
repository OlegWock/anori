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
import classnames, { clsx } from "clsx";
import React, { type ReactNode, useLayoutEffect, useState } from "react";
import "./Select.scss";
import { useDirection } from "@radix-ui/react-direction";
import { Icon } from "./Icon";

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: getOptionKey is allowed to be dynamic for convenience, but we don't wantg to reset input value on its every change
  useLayoutEffect(() => {
    setInnerValue(getOptionKey(value));
  }, [value]);

  return (
    <RadixSelectRoot value={innerValue} onValueChange={innerOnChange} dir={dir}>
      <RadixSelectTrigger className={clsx("SelectTrigger", triggerClassname)} aria-label={placeholder}>
        <RadixSelectValue placeholder={placeholder} />
        <RadixSelectIcon className="SelectIcon">
          <Icon icon="ion:chevron-down" />
        </RadixSelectIcon>
      </RadixSelectTrigger>
      <RadixSelectPortal>
        <RadixSelectContent className={clsx("SelectContent", contentClassname)}>
          <RadixSelectScrollUpButton className="SelectScrollButton">
            <Icon icon="ion:chevron-up" />
          </RadixSelectScrollUpButton>
          <RadixSelectViewport className="SelectViewport">
            {options.map((o) => {
              const key = getOptionKey(o);
              return (
                <SelectItem value={key} key={key}>
                  {getOptionLabel(o)}
                </SelectItem>
              );
            })}
          </RadixSelectViewport>
          <RadixSelectScrollDownButton className="SelectScrollButton">
            <Icon icon="ion:chevron-down" />
          </RadixSelectScrollDownButton>
        </RadixSelectContent>
      </RadixSelectPortal>
    </RadixSelectRoot>
  );
};

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children, className, ...props }, forwardedRef) => {
    return (
      <RadixSelectItem className={classnames("SelectItem", className)} {...props} ref={forwardedRef}>
        <RadixSelectItemText>{children}</RadixSelectItemText>
        <RadixSelectItemIndicator className="SelectItemIndicator">
          <Icon icon="ion:checkmark" />
        </RadixSelectItemIndicator>
      </RadixSelectItem>
    );
  },
);
