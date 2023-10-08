import { RequirePermissions } from '@components/RequirePermissions';
import './BookmarksBar.scss';
import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { Favicon, Icon } from '@components/Icon';
import { useSizeSettings } from '@utils/compact';
import { usePermissionsQuery } from '@utils/permissions';
import clsx from 'clsx';
import * as Menubar from '@radix-ui/react-menubar';
import { ScrollArea } from '@components/ScrollArea';
import { Link } from '@components/Link';
import { useDirection } from '@radix-ui/react-direction';

type BookmarkItem = {
    id: string,
    type: 'bookmark',
    url: string,
    title: string,
};

type BookmarkFolder = {
    id: string,
    type: 'folder',
    title: string,
    items: BookmarkType[],
};

type BookmarkType = BookmarkItem | BookmarkFolder;

const transformBrowserBookmarkItem = (item: browser.Bookmarks.BookmarkTreeNode): BookmarkType => {
    if (item.url) {
        return {
            type: 'bookmark',
            id: item.id,
            url: item.url,
            title: item.title,
        };
    } else {
        return {
            type: 'folder',
            id: item.id,
            title: item.title,
            items: item.children!.map(i => transformBrowserBookmarkItem(i)),
        }
    }
};

const useBookmarks = () => {
    const loadBookmarks = async () => {
        const tree = await browser.bookmarks.getTree();
        if (!tree[0].children) {
            return [];
        }

        const [bmBar, bmOther] = tree[0].children!;
        const parsedBar = bmBar.children!.map(b => transformBrowserBookmarkItem(b));
        const parsedOther = transformBrowserBookmarkItem(bmOther) as BookmarkFolder;
        setBookmarksBar(parsedBar);
        setOtherBookmarks(parsedOther);
    };

    const [bookmarksBar, setBookmarksBar] = useState<BookmarkType[]>([]);
    const [otherBookmarks, setOtherBookmarks] = useState<BookmarkFolder | null>(null);

    useEffect(() => {
        const handler = () => loadBookmarks();

        browser.bookmarks.onChanged.addListener(handler);
        // @ts-expect-error Chrome-only api
        if (browser.bookmarks.onChildrenReordered) browser.bookmarks.onChildrenReordered.addListener(handler);
        browser.bookmarks.onCreated.addListener(handler);
        browser.bookmarks.onMoved.addListener(handler);
        browser.bookmarks.onRemoved.addListener(handler);

        loadBookmarks();

        return () => {
            browser.bookmarks.onChanged.removeListener(handler);
            // @ts-expect-error Chrome-only api
            if (browser.bookmarks.onChildrenReordered) browser.bookmarks.onChildrenReordered.removeListener(handler);
            browser.bookmarks.onCreated.removeListener(handler);
            browser.bookmarks.onMoved.removeListener(handler);
            browser.bookmarks.onRemoved.removeListener(handler);
        }
    }, []);

    return [bookmarksBar, otherBookmarks] as const;
};

const MenuBookmark = ({ bookmark, shiftSubmenu }: { bookmark: BookmarkType, shiftSubmenu?: boolean }) => {
    const { rem } = useSizeSettings();
    const [scrollAreaOverflows, setScrollAreaOverflows] = useState(false);
    const dir = useDirection();

    if (bookmark.type === 'bookmark') {
        return (<Menubar.Item asChild>
            <Link className="MenuBookmark" href={bookmark.url}>
                <div className="content">
                    <Favicon url={bookmark.url} useFaviconApiIfPossible height={rem(1)} width={rem(1)} />
                    {!!bookmark.title && <span className="title">{bookmark.title}</span>}
                </div>
            </Link>
        </Menubar.Item>);
    }
    return (<Menubar.Sub>
        <Menubar.SubTrigger className="MenuBookmark">
            <div className="content">
                <Icon icon='ion:folder-open-sharp' height={rem(1)} width={rem(1)} />
                <span className="title">{bookmark.title}</span>
            </div>

            <Icon icon={dir === 'ltr' ? 'ion:chevron-forward' : 'ion:chevron-back'} />
        </Menubar.SubTrigger>
        <Menubar.Portal>
            <div className='radix-popover-zindex-fix'>
                <Menubar.SubContent className="BookmarksMenubarContent" alignOffset={rem(-0.5)} sideOffset={shiftSubmenu ? rem(0.75) + 12 : rem(0.75)}>
                    <ScrollArea color='translucent' onVerticalOverflowStatusChange={setScrollAreaOverflows} size='thin'>
                        {bookmark.items.map(bm => <MenuBookmark shiftSubmenu={scrollAreaOverflows} bookmark={bm} key={bm.id} />)}
                    </ScrollArea>
                </Menubar.SubContent>
            </div>
        </Menubar.Portal>
    </Menubar.Sub>);
};

const Bookmark = ({ bookmark, fullWidth }: { bookmark: BookmarkType, fullWidth?: boolean }) => {
    const { rem } = useSizeSettings();
    const [scrollAreaOverflows, setScrollAreaOverflows] = useState(false);

    const content = (<>
        {bookmark.type === 'bookmark' && <Favicon url={bookmark.url} useFaviconApiIfPossible height={rem(1)} width={rem(1)} />}
        {bookmark.type === 'folder' && <Icon className="folder-icon" icon='ion:folder-open-sharp' height={rem(1)} width={rem(1)} />}
        {!!bookmark.title && <span className="title">{bookmark.title}</span>}
    </>);

    if (bookmark.type === 'bookmark') {
        return (<Link className='Bookmark' href={bookmark.url}>
            {content}
        </Link>);
    }

    return (
        <Menubar.Menu>
            <Menubar.Trigger className={clsx("Bookmark", fullWidth && 'full-width')}>{content}</Menubar.Trigger>
            <Menubar.Portal>
                <div className='radix-popover-zindex-fix' onWheel={e => e.stopPropagation()}>
                    <Menubar.Content className="BookmarksMenubarContent" align="start" sideOffset={5} alignOffset={-3}>
                        <ScrollArea color='translucent' onVerticalOverflowStatusChange={setScrollAreaOverflows} size='thin'>
                            {bookmark.items.map(bm => <MenuBookmark shiftSubmenu={scrollAreaOverflows} bookmark={bm} key={bm.id} />)}
                        </ScrollArea>
                    </Menubar.Content>
                </div>
            </Menubar.Portal>
        </Menubar.Menu>
    );
};

const BookmarksBarComponent = () => {
    const [bar, other] = useBookmarks();
    const dir = useDirection();

    return (<Menubar.Root className='bookmarks' dir={dir}>
        {(bar.length === 0 && !other) && <div className='bookmarks-placeholder' />}

        <ScrollArea
            type='hover'
            direction='horizontal'
            color='translucent'
            size='thin'
            className='bookmarks-bar-wrapper'
            mirrorVerticalScrollToHorizontal
        >
            <div className='bookmarks-bar'>
                {bar.map(bm => <Bookmark bookmark={bm} key={bm.id} />)}
            </div>
        </ScrollArea>
        {!!other && <Bookmark bookmark={other} fullWidth />}
    </Menubar.Root>)
};


export const BookmarksBar = () => {
    const hasPermissions = usePermissionsQuery({ permissions: ["bookmarks", "favicon"] })
    return (<div className={clsx("BookmarksBar", hasPermissions && "transparent")}>
        <RequirePermissions permissions={["bookmarks", "favicon"]} compact>
            <BookmarksBarComponent />
        </RequirePermissions>
    </div>)
};