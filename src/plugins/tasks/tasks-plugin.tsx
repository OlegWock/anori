import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps, ID } from "@utils/user-data/types";
import { useRef, useState } from "react";
import './styles.scss';
import { Icon } from "@components/Icon";
import { getAllWidgetsByPlugin, getWidgetStorage, useWidgetStorage } from "@utils/plugin";
import { AnimatePresence, LayoutGroup, Reorder, motion, useDragControls } from "framer-motion";
import { Checkbox } from "@components/Checkbox";
import { guid } from "@utils/misc";
import { ScrollArea } from "@components/ScrollArea";
import { useSizeSettings } from "@utils/compact";

type TaskWidgetConfigType = {
    title: string,
};

type Task = {
    id: string,
    text: string,
};

type TaskWidgetStorageType = { tasks: Task[] };

const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<TaskWidgetConfigType>) => {
    const onConfirm = () => {
        saveConfiguration({ title });
    };

    const [title, setTitle] = useState(currentConfig ? currentConfig.title : 'ToDo');

    return (<div className="TasksWidget-config">
        <div>
            <label>Card title:</label>
            <Input value={title} onValueChange={setTitle} />
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const Task = ({ task, autoFocus, onEdit, onComplete }: {
    task: Task,
    autoFocus?: boolean,
    onEdit: (newText: string) => void,
    onComplete: () => void
}) => {
    const controls = useDragControls();
    const { rem } = useSizeSettings();

    return (<Reorder.Item
        key={task.id}
        value={task}
        layout
        className="task"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        dragListener={false}
        dragControls={controls}
    >
        <div className='drag-control'>
            <Icon icon='ic:baseline-drag-indicator' width={rem(1)} onPointerDown={(e) => {
                e.preventDefault();
                controls.start(e);
            }} />
        </div>
        <Checkbox checked={false} onChange={() => onComplete()} />
        <Input autoFocus={autoFocus} value={task.text} onValueChange={v => onEdit(v)} placeholder="Task description..." />
    </Reorder.Item>);
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<TaskWidgetConfigType>) => {
    const addTask = () => {
        const id = guid();
        setTasks(p => {
            return [
                ...p,
                { id, text: '' },
            ]
        });
        lastAddedTaskRef.current = id;
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


    const storage = useWidgetStorage<TaskWidgetStorageType>();
    const [tasks, setTasks] = storage.useValue('tasks', []);
    const lastAddedTaskRef = useRef('');

    return (<div className="TasksWidget">
        <div className="tasks-header">
            <h2>{config.title}</h2>
            <Button onClick={addTask}><Icon icon='ion:add' height={16} /></Button>
        </div>
        {tasks.length !== 0 && <ScrollArea darker>
            <LayoutGroup>
                <Reorder.Group axis="y" values={tasks} onReorder={setTasks} className="tasks-list" layout layoutScroll>
                    <AnimatePresence initial={false}>
                        {tasks.map(t => {
                            return (<Task task={t} key={t.id} onComplete={() => completeTask(t.id)} onEdit={v => editTask(t.id, v)} />);
                        })}
                    </AnimatePresence>
                </Reorder.Group>
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


const onCommandInput: OnCommandInputCallback = async (text: string) => {
    const pullTasksFromWidget = async (instaceId: ID) => {
        const storage = getWidgetStorage<TaskWidgetStorageType>(instaceId);
        await storage.waitForLoad();
        const tasks = storage.get('tasks') || [];
        return { tasks, instaceId };
    };

    const markTaskAsCompleted = async (instaceId: ID, taskId: ID) => {
        const storage = getWidgetStorage<TaskWidgetStorageType>(instaceId);
        await storage.waitForLoad();
        const tasks = storage.get('tasks') || [];
        storage.set('tasks', tasks.filter(t => t.id !== taskId));
    };

    const q = text.toLowerCase();
    const widgets = await getAllWidgetsByPlugin(tasksPlugin);
    const tasksByWidget = await Promise.all(widgets.map(w => pullTasksFromWidget(w.instanceId)));
    return tasksByWidget.flatMap(({ tasks, instaceId }) => {
        return tasks.filter(t => t.text.toLowerCase().includes(q)).map(t => {
            return {
                icon: 'ion:checkmark-circle-outline',
                text: `Complete '${t.text}'`,
                key: t.id,
                onSelected: () => {
                    markTaskAsCompleted(instaceId, t.id);
                },
            };
        });
    });
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
    onCommandInput,
} satisfies AnoriPlugin;