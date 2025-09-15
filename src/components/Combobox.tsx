import { forwardRef, useRef, useState } from "react";
import "./Combobox.scss";
import { builtinIcons } from "@anori/utils/builtin-icons";
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  offset,
  size,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import clsx from "clsx";
import { type HTMLMotionProps, m } from "framer-motion";
import { useEffect } from "react";
import { Icon } from "./Icon";
import { Input } from "./Input";

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
}

const Item = forwardRef<HTMLDivElement, ItemProps & React.HTMLProps<HTMLDivElement>>(
  ({ children, active, checked, ...rest }, ref) => {
    const id = useId();
    return (
      <div
        ref={ref}
        role="option"
        tabIndex={0}
        className="Combobox-option"
        id={id}
        aria-selected={active}
        data-active={active}
        data-selected={checked}
        {...rest}
        style={{
          cursor: "default",
          ...rest.style,
        }}
      >
        {active && <m.div className="highlight" layoutId="combobox-highlight" transition={{ duration: 0.075 }} />}
        <m.div className="content">
          <Icon className="check-icon" icon={builtinIcons.check} height={16} />
          {children}
        </m.div>
      </div>
    );
  },
);

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
      }),
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
          className: clsx("Combobox-input", className),
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
      {/* @ts-expect-error Declared component type not compatible with React 19 */}
      <FloatingPortal>
        {open && (
          // @ts-expect-error Declared component type not compatible with React 19
          <FloatingFocusManager context={context} initialFocus={-1} visuallyHiddenDismiss>
            <m.div
              {...getFloatingProps({
                ref: refs.setFloating,
                className: "Combobox-options",
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
                        // @ts-ignore maybe we should use refs.domReference to please ts?
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
              {items.length === 0 && <div className="Combobox-no-results">No results</div>}
            </m.div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </>
  );
};
