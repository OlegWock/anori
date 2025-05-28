import { localizeShortcut } from "@anori/utils/shortcuts";
import "./ShortcutHint.scss";

type ShortcutHintProps = {
  shortcut: string;
};

export const ShortcutHint = ({ shortcut }: ShortcutHintProps) => {
  const localizedShortcut = localizeShortcut(shortcut);
  return <div className="ShortcutHint">{localizedShortcut}</div>;
};
