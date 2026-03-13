export type BookmarkWidgetConfig = {
  url: string;
  title: string;
  icon: string;
  checkStatus?: boolean;
  openInNewTab?: boolean;
};

export type BookmarkGroupWidgetConfig = {
  title: string;
  icon: string;
  openInTabGroup: boolean;
  urls: string[];
};

export type BookmarksMessageHandlers = {
  openGroup: {
    args: {
      urls: string[];
      openInTabGroup: boolean;
      title: string;
      closeCurrentTab: boolean;
    };
    result: void;
  };
};
