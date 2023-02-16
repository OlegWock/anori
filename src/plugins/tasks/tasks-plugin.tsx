import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Popover } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import { getAllWidgetsByPlugin, useWidgetStorage } from "@utils/plugin";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Checkbox } from "@components/Checkbox";
import { guid } from "@utils/misc";
import { ScrollArea } from "@components/ScrollArea";

type TaskWidgetConfigType = {
    title: string,
};

type Task = {
    id: string,
    text: string,
}

const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<TaskWidgetConfigType>) => {
    const onConfirm = () => {
        saveConfiguration({ title });
    };

    const [title, setTitle] = useState('');

    return (<div className="TasksWidget-config">
        <div>
            <label>Card title:</label>
            <Input value={title} onValueChange={setTitle} />
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<TaskWidgetConfigType>) => {
    const addTask = () => {
        setTasks(p => {
            return [
                ...p,
                { id: guid(), text: '' },
            ]
        });
    };

    const completeTask = (id: Task["id"]) => {
        setTasks(p => p.filter(t => t.id !== id));
    };

    const editTask = (id: Task["id"], newVal: Task["text"]) => {
        setTasks(p => p.map(t => {
            if (t.id === id) return { ...t, text: newVal };
            return t;
        }));
    };

    const storage = useWidgetStorage<{ tasks: Task[] }>();
    const [tasks, setTasks] = storage.useValue('tasks', []);
    return (<div className="TasksWidget">
        <div className="tasks-header">
            <h2>{config.title}</h2>
            <Button onClick={addTask}><Icon icon='ion:add' height={16} /></Button>
        </div>
        {tasks.length !== 0 && <ScrollArea darker>
            <LayoutGroup>
                <motion.div className="tasks-list" layout>
                    <AnimatePresence initial={false}>
                        {tasks.map(t => {
                            return <motion.div
                                key={t.id}
                                layout
                                className="task"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Checkbox checked={false} onChange={() => completeTask(t.id)} />
                                <Input value={t.text} onValueChange={v => editTask(t.id, v)} placeholder="Task description..." />
                            </motion.div>
                        })}
                    </AnimatePresence>
                </motion.div>
            </LayoutGroup>
        </ScrollArea>}
        {tasks.length === 0 && <motion.div key='no-tasks' className="no-tasks">
            No tasks here yet
        </motion.div>}

    </div>);
};

const Mock = () => {
    const tasks: Task[] = [
        { id: '1', text: 'Stupid walk for stupid mental health' },
        { id: '2', text: 'Lay on couch' },
        { id: '3', text: 'Lay on floor' },
        { id: '4', text: 'Try not to cry' },
    ];

    return (<div className="TasksWidget">
        <div className="tasks-header">
            <h2>ToDo</h2>
            <Button><Icon icon='ion:add' height={16} /></Button>
        </div>
        <ScrollArea darker>
            <LayoutGroup>
                <motion.div className="tasks-list" layout>
                    <AnimatePresence initial={false}>
                        {tasks.map(t => {
                            return <motion.div
                                key={t.id}
                                layout
                                className="task"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Checkbox checked={false} />
                                <Input value={t.text} placeholder="Task description..." />
                            </motion.div>
                        })}
                    </AnimatePresence>
                </motion.div>
            </LayoutGroup>
        </ScrollArea>
    </div>);
};

const widgetDescriptorM = {
    id: 'tasks-m',
    name: 'Tasks - size m',
    configurationScreen: WidgetConfigScreen,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: Mock,
    size: {
        width: 2,
        height: 2,
    }
} as const;

const widgetDescriptorL = {
    id: 'tasks-l',
    name: 'Tasks - size l',
    configurationScreen: WidgetConfigScreen,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: Mock,
    size: {
        width: 3,
        height: 4,
    }
} as const;

export const tasksPlugin = {
    id: 'tasks-plugin',
    name: 'Tasks',
    widgets: [
        widgetDescriptorM,
        widgetDescriptorL,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;