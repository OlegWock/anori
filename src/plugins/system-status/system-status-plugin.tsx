
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetDescriptor, WidgetRenderProps } from '@utils/user-data/types';
import './styles.scss';
import browser from 'webextension-polyfill';
import { useMemo, useState } from 'react';
import { RequirePermissions } from '@components/RequirePermissions';
import { useEffect } from 'react';
import { Select } from '@components/Select';
import { Button } from '@components/Button';

type CpuTime = {
    idle: number,
    kernel: number,
    total: number,
    user: number,
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const avg = (arr: number[]) => arr.length === 0 ? 0 : (sum(arr) / arr.length);

const CpuWidgetScreen = ({ config, instanceId }: WidgetRenderProps<{}>) => {
    const [load, setLoad] = useState(0);
    useEffect(() => {
        const load = async () => {
            // @ts-ignore I couldn't make proper declarations for system.* APIs and it's just one time usage...
            const results = await browser.system.cpu.getInfo() as any;
            const cpuTime: CpuTime[] = results.processors.map((t: any) => t.usage);
            if (lastResults) {
                const load = lastResults.map((last, ind) => {
                    const current = cpuTime[ind];
                    const totalDiff = current.total - last.total;
                    const spentIdle = current.idle - last.idle;
                    return 1 - spentIdle / totalDiff;
                });
                const avgLoad = avg(load);
                setLoad(avgLoad);
            }
            lastResults = cpuTime;
        };
        load();

        let lastResults: null | CpuTime[] = null;
        const tid = setInterval(() => load(), 3000);

        const manualTids = [
            setTimeout(() => load(), 500),
            setTimeout(() => load(), 1000),
            setTimeout(() => load(), 2000),
        ]
        return () => {
            clearInterval(tid);
            manualTids.forEach(t => clearTimeout(t));
        }
    }, []);

    return (<div className='SystemStatusWidget'>
        <div className="metric-value">{(load * 100).toFixed(1)}%</div>
        <div className='spacer' />
        <div className="metric-name">CPU</div>
    </div>)
};

const MemoryWidgetScreen = ({ config, instanceId }: WidgetRenderProps<{}>) => {
    const [allocatedMemory, setAllocatedMemory] = useState(0);
    useEffect(() => {
        const load = async () => {
            // @ts-ignore I couldn't make proper declarations for system.* APIs and it's just one time usage...
            const results = await browser.system.memory.getInfo();
            const usedCapacity = results.capacity - results.availableCapacity;
            setAllocatedMemory(usedCapacity / results.capacity);
        };
        load();

        const tid = setInterval(() => load(), 1000 * 30);
        return () => clearInterval(tid);
    }, []);

    return (<div className='SystemStatusWidget'>
        <div className="metric-value">{(allocatedMemory * 100).toFixed(1)}%</div>
        <div className='spacer' />
        <div className="metric-name">RAM</div>
    </div>)
};


const cpuWidgetDescriptor = {
    id: 'cpu-load-status',
    name: 'CPU load',
    size: {
        width: 1,
        height: 1,
    },
    configurationScreen: null,
    mainScreen: CpuWidgetScreen,
    withAnimation: false,
    mock: () => (<CpuWidgetScreen config={{}} instanceId='mock' />),
} satisfies WidgetDescriptor<{}>;

const ramWidgetDescriptor = {
    id: 'ram-load-status',
    name: 'RAM load',
    size: {
        width: 1,
        height: 1,
    },
    configurationScreen: null,
    mainScreen: MemoryWidgetScreen,
    withAnimation: false,
    mock: () => (<MemoryWidgetScreen config={{}} instanceId='mock' />),
} satisfies WidgetDescriptor<{}>;

export const systemStatusPlugin = {
    id: 'system-status-plugin',
    name: 'System status',
    widgets: [
        cpuWidgetDescriptor,
        ramWidgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;