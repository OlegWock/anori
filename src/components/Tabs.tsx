import * as RadixTabs from '@radix-ui/react-tabs';
import './Tabs.scss';
import { Children, ReactElement, ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { usePrevious } from '@utils/hooks';

export type TabsProps = {
    children: ReactElement<TabProps> | ReactElement<TabProps>[],
    defaultTab: string,
};

const TabContent = motion(RadixTabs.Content);

const variants = {
    visible: {
        translateX: '0%',
        opacity: 1,
    },
    initial: (custom: 'right' | 'left') => {
        if (custom === 'left') {
            return {
                translateX: '-35%',
                opacity: 0,
            };
        } else {
            return {
                translateX: '35%',
                opacity: 0,
            };
        }
    },
    exit: (custom: 'right' | 'left') => {
        if (custom === 'left') {
            return {
                translateX: '35%',
                opacity: 0,
            };
        } else {
            return {
                translateX: '-35%',
                opacity: 0,
            };
        }
    }
}

export const Tabs = ({ children, defaultTab }: TabsProps) => {
    const tabs = Children.map(children, (el) => {
        return {
            title: el.props.title,
            id: el.props.id,
            content: el.props.children,
            className: el.props.className,
        };
    });

    const [activeTab, setActiveTab] = useState(defaultTab);
    const activeTabIndex = tabs.findIndex(t => t.id === activeTab);
    const activeTabInfo = tabs[activeTabIndex];
    const prevActiveTabIndex = usePrevious(activeTabIndex);

    const animationDirection = prevActiveTabIndex === undefined
        ? 'right'
        : activeTabIndex > prevActiveTabIndex
            ? 'right'
            : 'left';

    return (<RadixTabs.Root className="Tabs" defaultValue={defaultTab} onValueChange={setActiveTab} value={activeTab}>
        <RadixTabs.List className="Tabs-list" aria-label="Manage your account">
            {tabs.map(t => {
                return (<RadixTabs.Trigger className="Tabs-trigger" value={t.id} key={t.id}>
                    {t.title}
                </RadixTabs.Trigger>);
            })}
        </RadixTabs.List>


        <AnimatePresence initial={false} custom={animationDirection}>
            <TabContent
                value={activeTabInfo.id}
                key={activeTabInfo.id}

                className={clsx("Tabs-content", activeTabInfo.className)}
                transition={{
                    duration: 0.25,
                    type: 'tween',
                    ease: 'easeInOut'
                }}
                variants={variants}
                initial="initial"
                animate="visible"
                exit="exit"
                custom={animationDirection}
            >
                {activeTabInfo.content}
            </TabContent>
        </AnimatePresence>
    </RadixTabs.Root>);
};

export type TabProps = {
    title: ReactNode,
    id: string,
    children: ReactNode,
    className?: string,
};

export const Tab = ({ children }: TabProps) => {
    return (<div>
        {children}
    </div>);
};