import {
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
  type Ref,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import "./IconPicker.scss";
import { Select } from "@anori/components/lazy-components";
import { useSizeSettings } from "@anori/utils/compact";
import { useCustomIcons } from "@anori/utils/custom-icons";
import { choose } from "@anori/utils/misc";
import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FixedSizeList } from "react-window";
import browser from "webextension-polyfill";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Input } from "./Input";
import type { PopoverRenderProps } from "./Popover";
import { Tooltip } from "./Tooltip";
import { allSets, iconSetPrettyNames } from "./icons/all-sets";

type IconPickerProps = PopoverRenderProps<{
  onSelected: (icon: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}>;

type IconPickerContextType = {
  rowRefs: MutableRefObject<Record<string, HTMLButtonElement | undefined>>;
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

const iconsBySetAtom = atom<Record<string, string[]> | null>(null);
const ALL_SETS = "##ALL_SETS##";

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

    console.log("Move focus", direction, `from ${currentX}_${currentY}`, "new target", target);
    if (target) target.focus();
  };

  const onInputKeydown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && rowRefs.current["0_0"]) {
      rowRefs.current["0_0"].focus();
    }
  };

  const pickRandom = () => {
    const icon = choose(iconsList);
    data.onSelected(icon);
  };

  const rowRefs = useRef<IconPickerContextType["rowRefs"]["current"]>({});
  const [selectedFamily, setSelectedFamily] = useState(ALL_SETS);
  const [query, setQuery] = useState("");
  const [iconsBySet, setIconsBySet] = useAtom(iconsBySetAtom);
  const { customIcons } = useCustomIcons();
  const { t } = useTranslation();
  const { rem } = useSizeSettings();

  const iconsList = useMemo(() => {
    if (iconsBySet === null) return [];
    let base: [string, string[]][];
    if (selectedFamily === ALL_SETS) {
      base = [...Object.entries(iconsBySet), ["custom", customIcons.map((i) => i.name)]];
    } else if (selectedFamily === "custom") {
      base = [[selectedFamily, customIcons.map((i) => i.name)]];
    } else {
      base = [[selectedFamily, iconsBySet[selectedFamily]]];
    }
    return base
      .flatMap(([family, icons]) => icons.map((icon) => `${family}:${icon}`))
      .filter((icon) => icon.split(":")[1].includes(query.toLowerCase()));
  }, [selectedFamily, query, iconsBySet, customIcons]);

  const ROWS = Math.ceil(iconsList.length / COLUMNS);

  useEffect(() => {
    const load = async () => {
      const url = browser.runtime.getURL(`/assets/icons/meta.json`);
      const resp = await fetch(url);
      const json = (await resp.json()) as Record<string, string[]>;
      setIconsBySet(json);
    };
    if (iconsBySet === null) {
      load();
    }
  }, [iconsBySet]);

  return (
    <IconPickerContext.Provider value={{ rowRefs, moveFocus }}>
      <div className="IconPicker">
        <section>
          <label>{t("iconsPicker.iconFamily")}:</label>
          <Select<string>
            options={[ALL_SETS, ...allSets]}
            value={selectedFamily}
            onChange={setSelectedFamily}
            getOptionKey={(o) => o}
            getOptionLabel={(o) => (o === ALL_SETS ? t("iconsPicker.allIcons") : iconSetPrettyNames[o])}
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
            <Button onClick={pickRandom}>
              <Icon icon="ion:ios-shuffle" height={rem(1.5)} width={rem(1.5)} />
            </Button>
          </div>

          {selectedFamily === "custom" && iconsList.length === 0 ? (
            <div className="no-custom-icons-alert">
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
                onSelected: (icon) => {
                  close();
                  data.onSelected(icon);
                },
              }}
            >
              {IconRow}
            </FixedSizeList>
          )}
        </section>
      </div>
    </IconPickerContext.Provider>
  );
};
