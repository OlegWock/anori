import {
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
  type RefObject,
  Suspense,
  createContext,
  useContext,
  useDeferredValue,
  useRef,
  useState,
} from "react";
import "./IconPicker.scss";
import { CUSTOM_ICONS_SET_NAME } from "@anori/components/icon/custom-icons";
import { useIconSets, useIconsSuspense } from "@anori/components/icon/remote-icons";
import { Select } from "@anori/components/lazy-components";
import { useTranslation } from "react-i18next";
import { FixedSizeList } from "react-window";
import { Input } from "./Input";
import type { PopoverRenderProps } from "./Popover";
import { Tooltip } from "./Tooltip";
import { Icon } from "./icon/Icon";

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
        className="IconCell"
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
    <div className="IconRow" style={style}>
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
}: { selectedFamily: string; searchQuery: string; onSelected: (icon: string) => void }) => {
  const { t } = useTranslation();

  const { icons: iconsList } = useIconsSuspense({
    set: selectedFamily === ALL_SETS ? undefined : selectedFamily,
    searchQuery,
  });

  const ROWS = Math.ceil(iconsList.length / COLUMNS);

  return iconsList.length === 0 && selectedFamily === CUSTOM_ICONS_SET_NAME ? (
    <div className="empty-state-alert">
      <p>{t("iconsPicker.customIconsInfo")}</p>
      <p>{t("iconsPicker.customIconsAbsent")}</p>
    </div>
  ) : (
    // @ts-expect-error Declared component type not compatible with React 19
    <FixedSizeList<GridItemData>
      className="icons-grid"
      height={350}
      itemCount={ROWS}
      itemSize={ICON_SIZE + PADDING * 2}
      width={COLUMNS * (ICON_SIZE + PADDING * 2) + 8} // 8px is for scrollbar
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
    let target: HTMLButtonElement | undefined = undefined;
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
      <div className="IconPicker">
        <section>
          <label>{t("iconsPicker.iconFamily")}:</label>
          <Select<string>
            options={[ALL_SETS, ...iconSetIds]}
            value={selectedFamily}
            onChange={setSelectedFamily}
            getOptionKey={(o) => o}
            getOptionLabel={(o) => (o === ALL_SETS ? t("iconsPicker.allIcons") : prettyNames[o])}
          />
        </section>

        <section>
          <label>{t("icons")}: </label>

          <div className="icons-search-wrapper">
            <Input
              ref={data.inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="icons-search"
              onKeyUp={onInputKeydown}
            />
          </div>
          {selectedFamily === ALL_SETS && !query && (
            <div className="too-broad-alert">
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
