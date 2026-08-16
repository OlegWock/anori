import { WidgetHeader } from "@anori/components/WidgetHeader/WidgetHeader";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const widget = css({ display: "flex", flexDirection: "column", height: "100%" });
const title = css({ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "sm" });

const SAMPLE = [
  { title: "Designing Data-Intensive Applications", icon: builtinIcons.bookmark },
  { title: "The Rust Programming Language", icon: builtinIcons.code },
  { title: "CSS Grid Layout Guide", icon: builtinIcons.palette },
  { title: "Weekend hiking trails nearby", icon: builtinIcons.compass },
  { title: "Best coffee grinders 2026", icon: builtinIcons.dice },
];

export const StashWidgetMock = () => {
  const { t } = useTranslation();
  return (
    <div className={widget}>
      <WidgetHeader
        title={t("tabs-plugin.stash.title")}
        action={
          <IconButton size="medium" icon={builtinIcons.add} label={t("tabs-plugin.stash.stashTab")} variant="ghost" />
        }
      />
      {SAMPLE.map((item) => (
        <ListItem key={item.title}>
          <Icon icon={item.icon} width={18} height={18} color="icon.subtle" />
          <span className={title}>{item.title}</span>
        </ListItem>
      ))}
    </div>
  );
};
