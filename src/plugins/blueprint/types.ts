/**
 * Configuration for the main widget.
 * Persisted per widget instance and passed as `config` prop to the main screen.
 */
export type BlueprintWidgetConfig = {
  title: string;
  showIcon: boolean;
};

/**
 * Typed message handlers for background communication.
 * Keys are message names, values define args and result types.
 */
export type BlueprintMessageHandlers = {
  fetchData: {
    args: { query: string };
    result: { items: string[] };
  };
};

/**
 * Shape of widget-scoped storage.
 */
export type BlueprintWidgetStore = {
  lastRefreshed: number | null;
};
