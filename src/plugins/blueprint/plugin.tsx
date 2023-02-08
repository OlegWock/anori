import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AodakePlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Popover } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import { getAllWidgetsByPlugin } from "@utils/plugin";

type PluginWidgetConfigType = {

};


const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<PluginWidgetConfigType>) => {
    const onConfirm = () => {

        saveConfiguration({});
    };

    return (<div className="PluginWidget-config">
        <div>
            
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {

    return (<div className="PluginWidget">

    </div>);
};

const onCommandInput: OnCommandInputCallback = async (text: string) => {
    const q = text.toLowerCase();
    const widgets = await getAllWidgetsByPlugin(pluginnamePlugin);

    return [];
};

const widgetDescriptor = {
    id: 'widget',
    name: 'Widget name',
    configurationScreen: WidgetConfigScreen,
    withAnimation: true,
    mainScreen: MainScreen,
    mock: () => {
        return (<MainScreen instanceId="mock" config={{}} />)
    },
    size: {
        width: 1,
        height: 1,
    }
} as const;

export const pluginnamePlugin = {
    id: 'pluginname-plugin',
    name: 'Plugin',
    widgets: [
        widgetDescriptor,
    ],
    onCommandInput,
    configurationScreen: null,
} satisfies AodakePlugin;