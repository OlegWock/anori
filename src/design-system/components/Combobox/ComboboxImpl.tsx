import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Input } from "@anori/design-system/components/Input/Input";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const positioner = css({ zIndex: "tooltip" });

const optionsPanel = css({
  backgroundColor: "control",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "surface.elevated.border",
  borderRadius: "sm",
  boxShadow: "popover",
  padding: "1-5",
  minWidth: "var(--anchor-width)",
  maxHeight: "var(--available-height)",
  overflowY: "auto",
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-thumb": { backgroundColor: "scrollbar.thumb", borderRadius: "md" },
  "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
  scrollbarWidth: "thin",
  scrollbarColor: "var(--ds-frosted-strong) transparent",
});
const option = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  height: "30px",
  paddingLeft: "7",
  paddingRight: "4",
  borderRadius: "xs",
  fontSize: "sm",
  lineHeight: "none",
  color: "text.primary",
  userSelect: "none",
  cursor: "default",
  outline: "none",
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
const noResults = css({
  fontSize: "sm",
  lineHeight: "none",
  color: "text.primary",
  display: "flex",
  alignItems: "center",
  height: "30px",
  paddingInline: "4",
  userSelect: "none",
});

export type ComboboxProps<T> = {
  options: T[];
  getOptionKey: (opt: T) => string;
  getOptionLabel: (opt: T) => string;
  shouldDisplayOption: (opt: T, query: string) => boolean;
  value: T;
  onChange: (newVal: T) => void;
  onInputChange?: (newVal: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
};

export const ComboboxImpl = <T,>({
  options,
  getOptionKey,
  getOptionLabel,
  shouldDisplayOption,
  value,
  onChange,
  onInputChange,
  placeholder,
  className,
}: ComboboxProps<T>) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <BaseCombobox.Root<T>
      items={options}
      value={value}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(newVal) => onChange(newVal as T)}
      onInputValueChange={
        onInputChange
          ? (inputValue, eventDetails) => {
              if (eventDetails.reason === "input-change") onInputChange(inputValue);
            }
          : undefined
      }
      filter={onInputChange ? null : (item, query) => shouldDisplayOption(item, query)}
      itemToStringLabel={getOptionLabel}
      isItemEqualToValue={(a, b) => getOptionKey(a) === getOptionKey(b)}
    >
      <BaseCombobox.Input
        render={
          <Input
            placeholder={placeholder}
            className={className}
            onFocus={(e) => {
              e.currentTarget.select();
              setOpen(true);
            }}
          />
        }
      />
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner className={positioner} sideOffset={4}>
          <BaseCombobox.Popup className={optionsPanel}>
            <BaseCombobox.Empty>
              <div className={noResults}>{t("noResults")}</div>
            </BaseCombobox.Empty>
            <BaseCombobox.List>
              {(item: T) => (
                <BaseCombobox.Item key={getOptionKey(item)} value={item} className={option}>
                  <BaseCombobox.ItemIndicator className={itemIndicator}>
                    <Icon icon={builtinIcons.check} width={14} height={14} />
                  </BaseCombobox.ItemIndicator>
                  {getOptionLabel(item)}
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
};
