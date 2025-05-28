import { Command } from "cmdk";
import { useCallback, useEffect, useState } from "react";
import "./CommandMenu.scss";
import { Icon } from "@anori/components/Icon";
import { ScrollArea } from "@anori/components/ScrollArea";
import { availablePlugins } from "@anori/plugins/all";
import { trackEvent } from "@anori/utils/analytics";
import { wait } from "@anori/utils/misc";
import type { AnoriPlugin, CommandItem } from "@anori/utils/user-data/types";
import { useTranslation } from "react-i18next";

const ON_COMMAND_INPUT_TIMEOUT = 300;

type ActionsWithMetadata = {
  items: CommandItem[];
  plugin: AnoriPlugin<any, any>;
};

export const CommandMenu = ({ open, onOpenChange }: { open: boolean; onOpenChange: (newOpen: boolean) => void }) => {
  const updateQuery = (val: string) => {
    setQuery(val);
    loadActionsByQuery(val);
  };

  const loadActionsByQuery = useCallback(async (query: string) => {
    const promises = availablePlugins
      .filter((p) => !!p.onCommandInput)
      .map(async (p) => {
        const { onCommandInput } = p;
        const items = await Promise.race([
          wait(ON_COMMAND_INPUT_TIMEOUT).then(() => [] as CommandItem[]),
          onCommandInput
            ? onCommandInput(query).catch((err) => {
                console.error("Error in onCommandInput handler of", p);
                console.error(err);
                return [] as CommandItem[];
              })
            : [],
        ]);
        return {
          items,
          plugin: p,
        } satisfies ActionsWithMetadata;
      });

    const actions = await Promise.all(promises);
    setActions(actions);
  }, []);

  const [query, setQuery] = useState("");
  const [actions, setActions] = useState<ActionsWithMetadata[]>([]);
  const [initialized, setInitialized] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadActionsByQuery("").then(() => setInitialized(true));
  }, [loadActionsByQuery]);

  const itemsToRender = actions.flatMap(({ items }) => items);
  console.log("itemsToRender", itemsToRender);
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label={t("commandMenu.name")} shouldFilter={false}>
      <Command.Input
        value={query}
        onValueChange={updateQuery}
        className="Input"
        placeholder={t("commandMenu.placeholder")}
      />
      {initialized && (
        <Command.List>
          <ScrollArea className="cmdk-scrollarea">
            <div className="cmdk-scrollarea-content">
              {actions
                .filter(({ items }) => items.length !== 0)
                .map(({ plugin, items }) => {
                  return (
                    <Command.Group heading={plugin.name} key={plugin.id}>
                      {items.map(({ icon, text, hint, key, onSelected, image }) => {
                        return (
                          <Command.Item
                            key={key}
                            value={key}
                            onSelect={async () => {
                              onOpenChange(false);
                              setQuery("");
                              await trackEvent("Command option selected", { plugin: plugin.id });
                              onSelected();
                            }}
                          >
                            <div cmdk-item-icon="">
                              {!!icon && <Icon icon={icon} height={24} width={24} />}
                              {!!image && <img src={image} height={24} aria-hidden />}
                            </div>
                            <div cmdk-item-text="">{text}</div>
                            {!!hint && <div cmdk-item-right-hint="">{hint}</div>}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  );
                })}

              {itemsToRender.length === 0 && (
                <>
                  {!!query && <div cmdk-empty="">{t("noResults")}</div>}
                  {!query && <div cmdk-empty="">{t("commandMenu.noWidgets")}</div>}
                </>
              )}
            </div>
          </ScrollArea>
        </Command.List>
      )}
    </Command.Dialog>
  );
};
