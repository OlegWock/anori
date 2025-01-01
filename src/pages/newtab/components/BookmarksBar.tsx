import { RequirePermissions } from '@components/RequirePermissions';
import './BookmarksBar.scss';
import { useEffect, useRef, useState } from 'react';
import browser from 'webextension-polyfill';
import { Favicon, Icon } from '@components/Icon';
import { useSizeSettings } from '@utils/compact';
import { usePermissionsQuery } from '@utils/permissions';
import clsx from 'clsx';
import * as Menubar from '@radix-ui/react-menubar';
import { ScrollArea } from '@components/ScrollArea';
import { Link } from '@components/Link';
import { useDirection } from '@radix-ui/react-direction';
import { useVirtualizer } from '@tanstack/react-virtual';

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
                <VirtualizedBookmarksMenuContent bookmarks={bookmark.items} isSubmenu shiftSubmenu={shiftSubmenu} />
            </div>
        </Menubar.Portal>
    </Menubar.Sub>);
};

const VirtualizedBookmarksMenuContent = ({ bookmarks, isSubmenu = false, shiftSubmenu = false }: { bookmarks: BookmarkType[], isSubmenu?: boolean, shiftSubmenu?: boolean }) => {
    const { rem } = useSizeSettings();
    const [scrollAreaOverflows, setScrollAreaOverflows] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const virtualizer = useVirtualizer({
        count: bookmarks.length,
        getScrollElement: () => scrollAreaRef.current,
        estimateSize: () => rem(2.08),
    });

    const virtualizedItems = virtualizer.getVirtualItems();
    const firstItemOffset = virtualizedItems[0]?.start ?? 0;

    const WrapperComponent = isSubmenu ? Menubar.SubContent : Menubar.Content;
    const wrapperProps = isSubmenu ? {
        alignOffset: rem(-0.5),
        sideOffset: shiftSubmenu ? rem(0.75) + 12 : rem(0.75),
    } : {
        align: "start",
        sideOffset: 5,
        alignOffset: -3,
    };

    return (<WrapperComponent className="BookmarksMenubarContent" {...wrapperProps}>
        <ScrollArea
            color='translucent'
            onVerticalOverflowStatusChange={setScrollAreaOverflows}
            size='thin'
            viewportRef={scrollAreaRef}
        >
            <div style={{ height: virtualizer.getTotalSize() }}>
                <div style={{ transform: `translateY(${firstItemOffset}px)` }}>
                    {virtualizedItems.map((virtualItem) => {
                        const bm = bookmarks[virtualItem.index]
                        return <MenuBookmark shiftSubmenu={scrollAreaOverflows} bookmark={bm} key={bm.id} />
                    })}
                </div>
            </div>
        </ScrollArea>
    </WrapperComponent>)
};

const Bookmark = ({ bookmark, fullWidth }: { bookmark: BookmarkType, fullWidth?: boolean }) => {
    const { rem } = useSizeSettings();

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
                    <VirtualizedBookmarksMenuContent bookmarks={bookmark.items} />
                </div>
            </Menubar.Portal>
        </Menubar.Menu>
    );
};

const BookmarksBarComponent = () => {
    const [bar, other] = useBookmarks();
    const dir = useDirection();

    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const virtualizer = useVirtualizer({
        count: bar.length,
        horizontal: true,
        getScrollElement: () => scrollAreaRef.current,
        estimateSize: () => 144 + 12,
    });

    const virtualizedItems = virtualizer.getVirtualItems();
    const firstItemOffset = virtualizedItems[0]?.start ?? 0;

    return (<Menubar.Root className='bookmarks' dir={dir}>
        {(bar.length === 0 && !other) && <div className='bookmarks-placeholder' />}

        <ScrollArea
            type='hover'
            direction='horizontal'
            color='translucent'
            size='thin'
            className='bookmarks-bar-wrapper'
            mirrorVerticalScrollToHorizontal
            viewportRef={scrollAreaRef}
        >
            <div style={{ width: virtualizer.getTotalSize() }}>
                <div className='bookmarks-bar' style={{
                    transform: `translateX(${firstItemOffset}px)`,
                }}>
                    {virtualizedItems.map((virtualItem) => {
                        const bm = bar[virtualItem.index];
                        return <Bookmark bookmark={bm} key={bm.id} />
                    })}
                </div>
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