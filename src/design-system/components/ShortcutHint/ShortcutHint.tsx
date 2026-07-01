import { localizeShortcut } from "@anori/utils/shortcuts";
import { css } from "styled-system/css";

const shortcut = css({
  display: "inline-flex",
  marginInline: "3px",
  paddingBlock: "0",
  paddingInline: "1",
  borderRadius: "xs",
  bg: "accent",
  color: "on-accent",
  boxShadow: "0 2px 0 2px var(--ds-shortcut-shadow)",
});

type ShortcutHintProps = {
  shortcut: string;
};

export const ShortcutHint = ({ shortcut: value }: ShortcutHintProps) => {
  return <div className={shortcut}>{localizeShortcut(value)}</div>;
};
