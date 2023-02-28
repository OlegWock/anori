import './ShortcutHint.scss';

type ShortcutHintProps = {
    shortcut: string,
};

const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

const localizeShortcut = (shortcut: string) => {
    let pretty = shortcut.toUpperCase()
        .replace(/\+/g, '\uFE62')
        .replace(/\s/g, '')
        .replace(/UP/g, '↑')
        .replace(/DOWN/g, '↓')
        .replace(/CTRL/g, 'Ctrl')
        .replace(/SHIFT/g, 'Shift')
        .replace(/ESC/g, 'Esc');

    if (isMacLike) {
        pretty = pretty.replace(/ALT/g, '⌥').replace(/META/g, '⌘');
    } else {
        pretty = pretty.replace(/ALT/g, 'Alt').replace(/META/g, 'Ctrl');
    }

    return pretty;
};

export const ShortcutHint = ({ shortcut }: ShortcutHintProps) => {
    const localizedShortcut = localizeShortcut(shortcut);
    return (<div className="ShortcutHint">{localizedShortcut}</div>)
};