import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Combobox } from "@components/Combobox";

type PluginWidgetConfigType = {

};


const cities = [
    'Bratislava',
    'Trnava',
    'Kyiv',
    'Gdansk',
    'Berlin',
    'Prague',
    'Fukuoka',
    'Tokyo'
];

const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<PluginWidgetConfigType>) => {
    const onConfirm = () => {

        saveConfiguration({});
    };

    const [selectedCity, setCity] = useState('Kyiv');

    return (<div className="WeatherWidget-config">
        <div>Current city: {selectedCity}</div>
        <div>
            <label>Select city</label>
            <Combobox<string>
                options={cities}
                value={selectedCity}
                onChange={setCity}
                getOptionKey={o => o}
                getOptionLabel={o => o}
                shouldDisplayOption={(o, q) => o.toLowerCase().includes(q.toLowerCase())}
                placeholder="Select city"
            />
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {

    return (<div className="WeatherWidget">

    </div>);
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

export const weatherPlugin = {
    id: 'weather-plugin',
    name: 'Weather',
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;