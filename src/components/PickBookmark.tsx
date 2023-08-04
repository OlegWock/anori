import { useEffect, useState } from "react";
import { PopoverRenderProps } from "./Popover";
import browser from 'webextension-polyfill';
import { useTranslation } from "react-i18next";
import { useSizeSettings } from "@utils/compact";
import { Input } from "./Input";
import { ScrollArea } from "./ScrollArea";
import { Favicon } from "./Icon";
import { m } from "framer-motion";
import { RequirePermissions } from "./RequirePermissions";
import './PickBookmark.scss';

type BrowserBookmark = {
    id: string,
    title: string,
    url: string,
    dateAdded: number,
};

type PickBookmarkProps = {
    onSelected: (title: string, url: string) => void,
};

const _PickBookmark = ({ data: { onSelected }, close }: PopoverRenderProps<PickBookmarkProps>) => {
    const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        const walkNode = (node: browser.Bookmarks.BookmarkTreeNode): BrowserBookmark[] => {
            if (node.children) {
                const res = node.children.map(n => walkNode(n));
                return res.flat();
            } else {
                return [{
                    id: node.id,
                    title: node.title,
                    url: node.url!,
                    dateAdded: node.dateAdded || 0,
                }];
            }
        };

        const main = async () => {
            const nodes = await browser.bookmarks.getTree();
            const bookmarks = nodes.flatMap(n => walkNode(n));
            setBookmarks(bookmarks);
        }

        main();
    }, []);

    const { rem } = useSizeSettings();

    const filteredBookmarks = bookmarks.filter(({ title, url }) => {
        const q = searchQuery.toLowerCase();
        return title.toLowerCase().includes(q) || url.toLowerCase().includes(q);
    });

    return (<div className="PickBookmark">
        <Input value={searchQuery} onValueChange={setSearchQuery} placeholder={t('bookmark-plugin.searchBookmarks')} />
        <ScrollArea>
            {filteredBookmarks.map(bk => {
                return (<m.div
                    key={bk.id}
                    className='bookmark'
                    onClick={() => {
                        onSelected(bk.title, bk.url)
                        close();
                    }}
                >
                    <Favicon url={bk.url} height={rem(1)} />
                    <div className="title">
                        {bk.title || bk.url}
                    </div>
                </m.div>);
            })}
            {filteredBookmarks.length === 0 && <div className="no-results">
                {t('noResults')}
            </div>}
        </ScrollArea>
    </div>);
};

export const PickBookmark = (props: PopoverRenderProps<PickBookmarkProps>) => {
    return (<RequirePermissions permissions={["bookmarks", "favicon"]} >
        <_PickBookmark {...props} />
    </RequirePermissions >);
};