import { localizeShortcut } from '@utils/shortcuts';
import './ShortcutHint.scss';

type ShortcutHintProps = {
    shortcut: string,
};

export const ShortcutHint = ({ shortcut }: ShortcutHintProps) => {
    const localizedShortcut = localizeShortcut(shortcut);
    return (<div className="ShortcutHint">{localizedShortcut}</div>)
};