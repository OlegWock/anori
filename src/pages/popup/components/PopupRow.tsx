import { Heading } from "@anori/design-system/components/Heading/Heading";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import type { ReactNode } from "react";
import { css } from "styled-system/css";

export const list = css({ display: "flex", flexDirection: "column" });
const sectionTitle = css({ paddingInline: "2", paddingTop: "1", paddingBottom: "1-5" });
const rowTitle = css({ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const Row = ({ icon, title, onClick }: { icon: ReactNode; title: string; onClick: () => void }) => (
  <ListItem as="button" type="button" onClick={onClick}>
    {icon}
    <span className={rowTitle}>{title}</span>
  </ListItem>
);

export const iconOf = (icon: string) => <Icon icon={icon} width={18} color="icon" />;

export const SectionHeading = ({ children }: { children: ReactNode }) => (
  <Heading className={sectionTitle} level={2} size={4}>
    {children}
  </Heading>
);
