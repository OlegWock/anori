import { motion } from 'framer-motion';
import './FolderContent.scss';
import { Folder } from '@utils/user-data/types';
import { Icon } from '@components/Icon';
import clsx from 'clsx';
import { MutableRefObject } from 'react';

type FolderContentProps = {
    folder: Folder,
    animationDirection: 'up' | 'down',
    active: boolean,
};

const variants = {
    visible: {
        translateY: '0%',
        opacity: 1,
    },
    initial: (custom: 'up' | 'down') => {
        if (custom === 'up') {
            return {
                translateY: '-35%',
                opacity: 0,
            };
        } else {
            return {
                translateY: '35%',
                opacity: 0,
            };
        }
    },
    exit: (custom: 'up' | 'down') => {
        if (custom === 'up') {
            return {
                translateY: '35%',
                opacity: 0,
            };
        } else {
            return {
                translateY: '-35%',
                opacity: 0,
            };
        }
    }
}

export const FolderContent = ({ folder, active, animationDirection }: FolderContentProps) => {
    return (<motion.div
        key={`FolderContent-${folder.id}`}
        className={clsx({
            'FolderContent': true,
            'active': active,
        })}
        transition={{
            duration: 0.2,
            type: 'spring',
        }}
        variants={variants}
        initial="initial"
        animate="visible"
        exit="exit"
        custom={animationDirection}
    >
        <Icon icon={folder.icon} width={128} />
        <h1>Content of {folder.name}</h1>
    </motion.div>)
}