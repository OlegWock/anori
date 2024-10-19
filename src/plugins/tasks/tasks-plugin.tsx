import { Button } from "@components/Button";
import { Input, Textarea } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps, ID } from "@utils/user-data/types";
import { Suspense, forwardRef, lazy, useRef, useState } from "react";
import './styles.scss';
import { Icon } from "@components/Icon";
import { getAllWidgetsByPlugin, getWidgetStorage, useWidgetStorage } from "@utils/plugin";
import { AnimatePresence, LayoutGroup, m, MotionValue, useDragControls, useMotionValue, useTransform } from "framer-motion";
import { Checkbox } from "@components/Checkbox";
import { choose, guid } from "@utils/misc";
import { combineRefs } from "@utils/react";
import { ScrollArea } from "@components/ScrollArea";
import { useSizeSettings } from "@utils/compact";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import { listItemAnimation } from "@components/animations";
import { useCancelableAnimate } from "@utils/motion/hooks";
import { BetterAnimationPlaybackControls } from "@utils/motion/types";
import { useDirection } from "@radix-ui/react-direction";
import { useRunAfterNextRender } from "@utils/hooks";

const ReorderGroup = lazy(() => import('@utils/motion/lazy-load-reorder').then(m => ({ default: m.ReorderGroup })));
const ReorderItem = lazy(() => import('@utils/motion/lazy-load-reorder').then(m => ({ default: m.ReorderItem })));

type TaskWidgetConfigType = {
    title: string,
};

type Task = {
    id: string,
    text: string,
};

type TaskWidgetStorageType = { tasks: Task[] };

const devOnlyMockTasks = [
    `Buy groceries: Eggs, milk, bread, and fruits.`,
    `Finish report for work presentation.`,
    `Call plumber to fix the leaky faucet.`,
    `Read the first three chapters of "The Great Gatsby."`,
    `Pay monthly bills: electricity, internet, and water.`,
    `Plan weekend hiking trip: research trails and pack essentials.`,
    `Organize closet: donate unused clothes.`,
    `Schedule dentist appointment for a check-up.`,
    `Write birthday card for mom.`,
    `Complete online course module on time management.`,
    `Update LinkedIn profile with recent achievements.`,
    `Water indoor plants and apply fertilizer.`,
    `Install updates for computer and phone.`,
    `Sort out paperwork for tax filing.`,
    `Research recipes for a dinner party menu.`,
    `Run 5 kilometers in the park.`,
    `Create a budget for the upcoming month.`,
    `Call Jane to catch up and arrange a coffee date.`,
    `Declutter garage: organize tools and donate old items.`,
    `Start a journal: write about the day's highlights and reflections.`,
];


const Scribble = ({ progress }: { progress: MotionValue<number> }) => {
    const dir = useDirection()

    const display = useTransform(progress, (v) => v === 0 ? 'none' : 'block');

    return (
        <m.svg
            xmlns="http://www.w3.org/2000/svg"
            fillRule="evenodd"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="1.5"
            clipRule="evenodd"
            viewBox="0 0 450 100"
            className="scribble"
            preserveAspectRatio="none"
            style={{
                scaleX: dir === 'rtl' ? -1 : 1,
                display
            }}
        >
            <m.path
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                d="M555 250s29.462-28.973 47-33c-16.023 22.729-42.826 68.074-45 82 17.983-23.371 69.102-67.995 80.24-69.964C623.278 252.289 612.923 275.993 605 300c25.22-31.052 48.497-54.183 69-66-10.213 16.227-17.608 32.572-23 49 28.694-34.388 54.013-58.222 71-56-19.088 35.256-28.268 55.016-28 60 29.819-27.767 63.526-61.176 78-59-8.469 25.555-21.84 35.374-30 59 30.4-26.291 62.256-54.721 77-58-13.465 22.016-24.184 45.015-33 67 27.334-28.012 53.189-54.498 65-56 2.246 5.085-13.629 32.302-24 57 27.526-27.99 55.886-58.066 73-60 .983 6.374-14.012 25.95-26 54 18.558-21.423 36.626-41.184 50-45-10.498 20.536-23.786 42.256-23 58 18.008-18.065 36.051-36.222 48-38-7.189 12.097-12.698 24.12-15 36 6.88-6.42 13.86-12.212 21-17"
                transform="translate(-530 -210.5)"
                pathLength={progress}
            ></m.path>
        </m.svg>
    );
};

const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<TaskWidgetConfigType>) => {
    const onConfirm = () => {
        saveConfiguration({ title });
    };

    const { t } = useTranslation();
    const [title, setTitle] = useState(currentConfig ? currentConfig.title : t('tasks-plugin.todo'));

    return (<div className="TasksWidget-config">
        <div>
            <label>{t('title')}:</label>
            <Input value={title} onValueChange={setTitle} />
        </div>

        <Button className="save-config" onClick={onConfirm}>{t('save')}</Button>
    </div>);
};

type TaskProps = {
    task: Task,
    onEdit: (newText: string) => void,
    onComplete: () => void,
    onEnterKeyPress: () => void,
};

const Task = forwardRef<HTMLDivElement, TaskProps>(({ task, onEdit, onComplete, onEnterKeyPress }, ref) => {
    const onCheckboxChange = (checked: boolean) => {
        setChecked(checked);
        if (checked) {
            if (animationRef.current) animationRef.current.stop();

            animationRef.current = animate(completionProgress, 1, { duration: 0.95, ease: 'easeInOut' });
            animationRef.current.then(({ reason }) => {
                console.log('Animation complete', { reason });
                if (reason === 'finished') onComplete();
            });
        } else {
            if (animationRef.current) {
                animationRef.current.stop();
                animationRef.current = animate(completionProgress, 0, { duration: 0.5, ease: 'easeInOut' });
            }
        }
    };

    const controls = useDragControls();
    const { rem } = useSizeSettings();
    const { t } = useTranslation();
    const [checked, setChecked] = useState(false);
    const [scope, animate] = useCancelableAnimate();
    const mergedRef = combineRefs(ref, scope);
    const animationRef = useRef<BetterAnimationPlaybackControls | null>(null);
    const checkboxRef = useRef<HTMLDivElement>(null);

    const completionProgress = useMotionValue(0);

    return (<ReorderItem
        key={task.id}
        value={task}
        className="task"
        layout="position"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        dragListener={false}
        dragControls={controls}
        ref={mergedRef}
        data-task-id={task.id}
    >
        <div className='drag-control'>
            <Icon icon='ic:baseline-drag-indicator' width={rem(1)} onPointerDown={(e) => {
                e.preventDefault();
                controls.start(e);
            }} />
        </div>
        <Checkbox
            ref={checkboxRef}
            checked={checked}
            onChange={onCheckboxChange}
            transition={{
                duration: 0.15,
            }}
            variants={{
                checked: {
                    scale: [null, 1.3, 1],
                }
            }}
        />
        <m.div className="input-wrapper">
            <Scribble progress={completionProgress} />

            <Textarea
                value={task.text}
                onValueChange={v => onEdit(v)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        onEnterKeyPress()
                    }
                }}
                placeholder={t('tasks-plugin.taskDescription')}
                maxRows={4}
                spellCheck={false}
            />
        </m.div>
    </ReorderItem>);
});

const MainScreen = ({ config, instanceId }: WidgetRenderProps<TaskWidgetConfigType>) => {
    const addTask = () => {
        const id = guid();
        setTasks(p => {
            return [
                ...p,
                { id, text: X_MODE === 'development' ? choose(devOnlyMockTasks) : '' },
            ]
        });
        runAfterRender(() => {
            document.querySelector<HTMLInputElement>(`[data-task-id="${id}"] .Input`)?.focus();
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


    const storage = useWidgetStorage<TaskWidgetStorageType>();
    const [tasks, setTasks] = storage.useValue('tasks', []);
    const { t } = useTranslation();
    const runAfterRender = useRunAfterNextRender();

    return (<m.div className="TasksWidget" layoutRoot>
        <div className="tasks-header">
            <h2>{config.title}</h2>
            <Button onClick={addTask}><Icon icon='ion:add' height={16} /></Button>
        </div>
        <ScrollArea color="dark" style={{display: tasks.length === 0 ? 'none' : 'flex'}}>
            <Suspense>
                <LayoutGroup>
                    <ReorderGroup axis="y" values={tasks} onReorder={setTasks} className="tasks-list" layoutScroll layoutRoot>
                        <AnimatePresence initial={false}>
                            {tasks.map(t => {
                                return (<Task
                                    task={t}
                                    key={t.id}
                                    onComplete={() => completeTask(t.id)}
                                    onEdit={v => editTask(t.id, v)}
                                    onEnterKeyPress={addTask}
                                />);
                            })}
                        </AnimatePresence>
                    </ReorderGroup>
                </LayoutGroup>
            </Suspense>
        </ScrollArea>
        {tasks.length === 0 && <m.div key='no-tasks' className="no-tasks">
            {t('tasks-plugin.noTasks')}
        </m.div>}
    </m.div>);
};

const Mock = () => {
    const { t } = useTranslation();
    const tasks: Task[] = [
        { id: '0', text: t('tasks-plugin.exampleTask0') },
        { id: '1', text: t('tasks-plugin.exampleTask1') },
        { id: '2', text: t('tasks-plugin.exampleTask2') },
        { id: '3', text: t('tasks-plugin.exampleTask3') },
    ];

    return (<div className="TasksWidget">
        <div className="tasks-header">
            <h2>{t('tasks-plugin.todo')}</h2>
            <Button><Icon icon='ion:add' height={16} /></Button>
        </div>
        <ScrollArea color="dark">
            <m.div className="tasks-list">
                <AnimatePresence initial={false}>
                    {tasks.map(t => {
                        return <m.div
                            key={t.id}
                            className="task"
                            {...listItemAnimation}
                        >
                            <Checkbox checked={false} />
                            <Input value={t.text} />
                        </m.div>
                    })}
                </AnimatePresence>
            </m.div>
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
                text: translate('tasks-plugin.completeTask', { task: t.text }),
                key: t.id,
                onSelected: () => {
                    markTaskAsCompleted(instaceId, t.id);
                },
            };
        });
    });
};

export const tasksWidgetDescriptor = {
    id: 'tasks-widget',
    get name() {
        return translate('tasks-plugin.name');
    },
    configurationScreen: WidgetConfigScreen,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: Mock,
    appearance: {
        resizable: {
            min: { width: 2, height: 2 },
        },
        size: {
            width: 2,
            height: 2,
        }
    }
} as const;

export const tasksPlugin = {
    id: 'tasks-plugin',
    get name() {
        return translate('tasks-plugin.name');
    },
    widgets: [
        tasksWidgetDescriptor,
    ],
    configurationScreen: null,
    onCommandInput,
} satisfies AnoriPlugin;