import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Input } from "@anori/design-system/components/Input/Input";
import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  type SizeOptions,
  size,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { type HTMLMotionProps, m } from "framer-motion";
import { type Ref, useEffect, useRef, useState } from "react";
import { css, cva } from "styled-system/css";

// Floating list panel — elevated surface + drop shadow on the tooltip layer (so it clears a modal it
// was opened from); thin frosted scrollbar.
const optionsPanel = css({
  backgroundColor: "surface.elevated",
  borderRadius: "sm",
  boxShadow: "popover",
  zIndex: "tooltip",
  padding: "1-5",
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-thumb": { backgroundColor: "frosted.strong", borderRadius: "md" },
  "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
  scrollbarWidth: "thin",
  scrollbarColor: "var(--ds-frosted-strong) transparent",
});
const option = cva({
  base: {
    fontSize: "sm",
    lineHeight: "none",
    color: "text.primary",
    borderRadius: "xs",
    display: "flex",
    alignItems: "center",
    height: "30px",
    paddingInline: "4",
    userSelect: "none",
    cursor: "default",
    outline: "none",
  },
  variants: { active: { true: { backgroundColor: "control" } } },
});
const optionContent = css({ display: "flex", gap: "2" });
const checkIcon = cva({
  base: { flexShrink: 0, flexGrow: 0, opacity: 0 },
  variants: { visible: { true: { opacity: 1 } } },
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
} & Omit<HTMLMotionProps<"div">, "onChange">;

interface ItemProps {
  children: React.ReactNode;
  active: boolean;
  checked: boolean;
  ref?: Ref<HTMLDivElement>;
}

const Item = ({
  children,
  active,
  checked,
  ref,
  ...rest
}: ItemProps & Omit<React.HTMLProps<HTMLDivElement>, "ref">) => {
  const id = useId();
  return (
    <div
      ref={ref}
      role="option"
      tabIndex={0}
      className={option({ active })}
      id={id}
      aria-selected={active}
      data-active={active}
      data-selected={checked}
      {...rest}
    >
      <m.div className={optionContent}>
        <Icon className={checkIcon({ visible: checked })} icon={builtinIcons.check} height={16} />
        {children}
      </m.div>
    </div>
  );
};

export const Combobox = <T,>({
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
  const localOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inpValue = event.target.value;
    setInputValue(inpValue);
    if (onInputChange) onInputChange(inpValue);

    if (inpValue) {
      setOpen(true);
      openRef.current = true;
      setActiveIndex(0);
    } else {
      setOpen(false);
      openRef.current = false;
    }
  };

  const resetValueIfNeeded = () => {
    if (!inputFocusedRef.current && !openRef.current) {
      setInputValue(getOptionLabel(value));
    }
  };

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openRef = useRef(false);
  const inputFocusedRef = useRef(false);

  const listRef = useRef<Array<HTMLElement | null>>([]);

  const { x, y, strategy, refs, context } = useFloating<HTMLInputElement>({
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange: (open) => {
      setOpen(open);
      openRef.current = open;
    },
    middleware: [
      size({
        apply({ rects, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
            maxHeight: `${availableHeight}px`,
          });
        },
        padding: 10,
      } satisfies SizeOptions),
      offset({ mainAxis: 4 }),
    ],
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useRole(context, { role: "listbox" }),
    useDismiss(context),
    useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: setActiveIndex,
      virtual: true,
      loop: true,
    }),
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: getOptionLabel is allowed to be dynamic for convenience, but we don't want to reset input value on its every change
  useEffect(() => {
    setInputValue(getOptionLabel(value));
  }, [value]);

  const items = options.filter((opt) => shouldDisplayOption(opt, inputValue));
  const valKey = getOptionKey(value);
  return (
    <>
      <Input
        {...getReferenceProps({
          ref: refs.setReference,
          onChange: localOnChange,
          value: inputValue,
          placeholder,
          className,
          "aria-autocomplete": "list",
          onKeyDown(event) {
            if (event.key === "Enter" && activeIndex != null && items[activeIndex]) {
              setInputValue(getOptionLabel(items[activeIndex]));
              onChange(items[activeIndex]);
              setActiveIndex(null);
              setOpen(false);
              openRef.current = false;
            }
          },
          onFocus: () => {
            inputFocusedRef.current = true;
          },
          onBlur: () => {
            inputFocusedRef.current = false;
            resetValueIfNeeded();
          },
        })}
      />
      <FloatingPortal>
        {open && (
          <FloatingFocusManager context={context} initialFocus={-1} visuallyHiddenDismiss>
            <m.div
              {...getFloatingProps({
                ref: refs.setFloating,
                className: optionsPanel,
                style: {
                  position: strategy,
                  left: x ?? 0,
                  top: y ?? 0,
                  overflowY: "auto",
                },
              })}
            >
              {items.map((item, index) => {
                const itemKey = getOptionKey(item);
                return (
                  <Item
                    key={getOptionKey(item)}
                    {...getItemProps({
                      ref(node) {
                        listRef.current[index] = node;
                      },
                      onClick() {
                        onChange(item);
                        setInputValue(getOptionLabel(item));
                        setOpen(false);
                        openRef.current = false;
                        // @ts-expect-error maybe we should use refs.domReference to please ts?
                        refs.reference.current?.focus();
                      },
                    })}
                    active={activeIndex === index}
                    checked={itemKey === valKey}
                  >
                    {getOptionLabel(item)}
                  </Item>
                );
              })}
              {items.length === 0 && <div className={noResults}>No results</div>}
            </m.div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </>
  );
};
