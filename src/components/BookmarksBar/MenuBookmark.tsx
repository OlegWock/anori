import { Link } from "@anori/components/Link";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useSizeSettings } from "@anori/utils/compact";
import { useDirection } from "@radix-ui/react-direction";
import * as Menubar from "@radix-ui/react-menubar";
import { css } from "styled-system/css";
import { VirtualizedBookmarksMenuContent, zIndexFix } from "./BookmarksMenuContent";
import type { BookmarkType } from "./useBookmarks";

const menuItem = css({
  padding: "2",
  borderRadius: "md",
  whiteSpace: "nowrap",
  overflow: "hidden",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "2",
  textDecoration: "none",
  transitionProperty: "background-color",
  transitionDuration: "0.1s",
  transitionTimingFunction: "ease-in-out",
  lineHeight: "tight",
  fontSize: "sm",
  userSelect: "none",
  _hover: { background: "frosted" },
  "&:focus-visible": { outline: "none", background: "frosted" },
});
const content = css({
  flexGrow: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "2",
  overflow: "hidden",
});
const title = css({ textOverflow: "ellipsis", overflow: "hidden", flexGrow: 1 });

export const MenuBookmark = ({ bookmark: bm, shiftSubmenu }: { bookmark: BookmarkType; shiftSubmenu?: boolean }) => {
  const { rem } = useSizeSettings();
  const dir = useDirection();

  if (bm.type === "bookmark") {
    return (
      <Menubar.Item asChild>
        <Link className={menuItem} href={bm.url}>
          <div className={content}>
            <Favicon url={bm.url} useFaviconApiIfPossible height={rem(1)} width={rem(1)} />
            {!!bm.title && <span className={title}>{bm.title}</span>}
          </div>
        </Link>
      </Menubar.Item>
    );
  }
  return (
    <Menubar.Sub>
      <Menubar.SubTrigger className={menuItem}>
        <div className={content}>
          <Icon icon={builtinIcons.folder} size="sm" />
          <span className={title}>{bm.title}</span>
        </div>

        <Icon size="sm" icon={dir === "ltr" ? builtinIcons.chevronForward : builtinIcons.chevronBack} />
      </Menubar.SubTrigger>
      <Menubar.Portal>
        <div className={zIndexFix}>
          <VirtualizedBookmarksMenuContent bookmarks={bm.items} isSubmenu shiftSubmenu={shiftSubmenu} />
        </div>
      </Menubar.Portal>
    </Menubar.Sub>
  );
};
