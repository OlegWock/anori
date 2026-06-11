import { Select } from "@anori/components/lazy-components";
import { Field } from "@anori/design-system/components/Field/Field";
import { CUSTOM_ICONS_SET_NAME } from "@anori/design-system/components/Icon/custom-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useIconSets, useIconsSuspense } from "@anori/design-system/components/Icon/remote-icons";
import { Input } from "@anori/design-system/components/Input/Input";
import type { PopoverRenderProps } from "@anori/design-system/components/Popover/Popover";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import {
  type CSSProperties,
  createContext,
  type KeyboardEvent,
  type Ref,
  type RefObject,
  Suspense,
  useContext,
  useDeferredValue,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { FixedSizeList } from "react-window";
import { css } from "styled-system/css";

const iconPicker = css({ display: "flex", flexDirection: "column", gap: "4" });
const section = css({ display: "flex", flexDirection: "column", alignItems: "stretch" });
const searchWrapper = css({ display: "flex", gap: "2", marginBottom: "3", "& .Input": { flexGrow: 1 } });
const tooBroadAlert = css({
  borderRadius: "md",
  backgroundColor: "surface.elevated",
  fontSize: "sm",
  marginBottom: "2",
});
const emptyStateAlert = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "6",
  paddingBlock: "12",
  paddingInline: "6",
  textAlign: "center",
});
// react-window owns the scroll container, so we can't wrap it in <ScrollArea>; style the native
// scrollbar directly (mirrors the legacy scroll-mixin: thumb on the elevated surface, track on card).
const iconsGrid = css({
  alignSelf: "center",
  overflowX: "hidden !important",
  "&::-webkit-scrollbar": { width: "7px", height: "7px" },
  "&::-webkit-scrollbar-thumb": {
    borderRadius: "md",
    border: "2px solid var(--ds-surface-elevated)",
    backgroundColor: "surface.elevated",
  },
  "&::-webkit-scrollbar-track": { backgroundColor: "card", borderRadius: "md" },
  scrollbarColor: "var(--ds-surface-elevated) transparent",
});
const iconRow = css({ display: "flex" });
const iconCell = css({
  transition: "0.05s ease-in-out",
  contain: "paint",
  outline: "none",
  _hover: { background: "frosted.strong", borderRadius: "sm", cursor: "pointer" },
  _focusVisible: { background: "frosted.strong", borderRadius: "sm", cursor: "pointer", outline: "none" },
});

type IconPickerProps = PopoverRenderProps<{
  onSelected: (icon: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}>;

type IconPickerContextType = {
  rowRefs: RefObject<Record<string, HTMLButtonElement | undefined>>;
  moveFocus: (direction: "up" | "down" | "left" | "right", currentX: number, currentY: number) => void;
};

const IconPickerContext = createContext<IconPickerContextType>({
  rowRefs: { current: {} },
  moveFocus: (_direction, _curX, _curY) => {},
});

const COLUMNS = 8;
const ICON_SIZE = 32;
const PADDING = 10;
// The grid and the picker share this width so the search input/select line up with the icon columns
// (+8 for the scrollbar gutter).
const GRID_WIDTH = COLUMNS * (ICON_SIZE + PADDING * 2) + 8;

const IconCell = ({ icon, onClick, x, y }: { icon: string; onClick?: () => void; x: number; y: number }) => {
  const registerRef = (el: HTMLButtonElement | null) => {
    if (el) {
      rowRefs.current[key] = el;
    } else {
      rowRefs.current[key] = undefined;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight") moveFocus("right", x, y);
    if (e.key === "ArrowLeft") moveFocus("left", x, y);
    if (e.key === "ArrowUp") moveFocus("up", x, y);
    if (e.key === "ArrowDown") moveFocus("down", x, y);
  };

  const key = `${x}_${y}`;
  const { moveFocus, rowRefs } = useContext(IconPickerContext);

  return (
    <Tooltip label={icon} placement="bottom" showDelay={2000} resetDelay={0} targetRef={registerRef} ignoreFocus>
      <button
        type="button"
        style={{ padding: PADDING }}
        className={iconCell}
        data-icon={icon}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <Icon icon={icon} cache={false} width={ICON_SIZE} height={ICON_SIZE} />
      </button>
    </Tooltip>
  );
};

const IconRow = ({ index, data, style }: { index: number; style: CSSProperties; data: GridItemData }) => {
  const indexStart = index * COLUMNS;
  const indexEnd = Math.min(indexStart + COLUMNS, data.iconsList.length);

  return (
    <div className={iconRow} style={style}>
      {data.iconsList.slice(indexStart, indexEnd).map((icon, currentX) => {
        return <IconCell key={icon} icon={icon} onClick={() => data.onSelected(icon)} x={currentX} y={index} />;
      })}
    </div>
  );
};

type GridItemData = {
  iconsList: string[];
  onSelected: (name: string) => void;
};

const ALL_SETS = "##ALL_SETS##";

const IconsGrid = ({
  searchQuery,
  selectedFamily,
  onSelected,
}: {
  selectedFamily: string;
  searchQuery: string;
  onSelected: (icon: string) => void;
}) => {
  const { t } = useTranslation();

  const { icons: iconsList } = useIconsSuspense({
    set: selectedFamily === ALL_SETS ? undefined : selectedFamily,
    searchQuery,
  });

  const ROWS = Math.ceil(iconsList.length / COLUMNS);

  return iconsList.length === 0 && selectedFamily === CUSTOM_ICONS_SET_NAME ? (
    <div className={emptyStateAlert}>
      <p>{t("iconsPicker.customIconsInfo")}</p>
      <p>{t("iconsPicker.customIconsAbsent")}</p>
    </div>
  ) : (
    <FixedSizeList<GridItemData>
      className={iconsGrid}
      height={350}
      itemCount={ROWS}
      itemSize={ICON_SIZE + PADDING * 2}
      width={GRID_WIDTH}
      itemData={{
        iconsList,
        onSelected,
      }}
    >
      {IconRow}
    </FixedSizeList>
  );
};

export const IconPicker = ({ data, close }: IconPickerProps) => {
  const moveFocus = (direction: "up" | "down" | "left" | "right", currentX: number, currentY: number) => {
    let target: HTMLButtonElement | undefined;
    if (direction === "up") {
      target = rowRefs.current[`${currentX}_${currentY - 1}`];
    }
    if (direction === "left") {
      if (currentX === 0) {
        for (let i = COLUMNS - 1; i > 0; i--) {
          target = rowRefs.current[`${i}_${currentY}`];
          if (target) break;
        }
      } else {
        target = rowRefs.current[`${currentX - 1}_${currentY}`];
      }
    }
    if (direction === "right") {
      target = rowRefs.current[`${currentX + 1}_${currentY}`];
      if (!target) {
        target = rowRefs.current[`0_${currentY}`];
      }
    }
    if (direction === "down") {
      target = rowRefs.current[`${currentX}_${currentY + 1}`];
      if (!target) {
        for (let i = COLUMNS - 1; i > 0; i--) {
          target = rowRefs.current[`${i}_${currentY + 1}`];
          if (target) break;
        }
      }
    }

    if (target) target.focus();
  };

  const onInputKeydown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && rowRefs.current["0_0"]) {
      rowRefs.current["0_0"].focus();
    }
  };

  const rowRefs = useRef<IconPickerContextType["rowRefs"]["current"]>({});
  const [selectedFamily, setSelectedFamily] = useState(ALL_SETS);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const deferredSelectedFamily = useDeferredValue(selectedFamily);
  const { t } = useTranslation();

  const { iconSetIds, prettyNames } = useIconSets();

  return (
    <IconPickerContext.Provider value={{ rowRefs, moveFocus }}>
      <div className={iconPicker} style={{ width: GRID_WIDTH }}>
        <section className={section}>
          <Field label={`${t("iconsPicker.iconFamily")}:`}>
            <Select<string>
              options={[ALL_SETS, ...iconSetIds]}
              value={selectedFamily}
              onChange={setSelectedFamily}
              getOptionKey={(o) => o}
              getOptionLabel={(o) => (o === ALL_SETS ? t("iconsPicker.allIcons") : prettyNames[o])}
            />
          </Field>
        </section>

        <section className={section}>
          <Field label={`${t("icons")}:`}>
            <div className={searchWrapper}>
              <Input
                ref={data.inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                onKeyUp={onInputKeydown}
              />
            </div>
          </Field>
          {selectedFamily === ALL_SETS && !query && (
            <div className={tooBroadAlert}>
              <p>{t("iconsPicker.selectFamilyOrSearch")}</p>
            </div>
          )}
          <Suspense fallback={null}>
            <IconsGrid
              selectedFamily={deferredSelectedFamily}
              searchQuery={deferredQuery}
              onSelected={(icon) => {
                close();
                data.onSelected(icon);
              }}
            />
          </Suspense>
        </section>
      </div>
    </IconPickerContext.Provider>
  );
};
