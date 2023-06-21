export const listItemAnimation = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { opacity: 0 },
};

export const slidingScreensAnimation = {
    init: (direction: 'right' | 'left' | 'none') => {
        if (direction === 'left') {
            return {
                x: '-35%',
                opacity: 0,
            };
        } else if (direction === 'right') {
            return {
                x: '35%',
                opacity: 0,
            };
        } else {
            return {};
        }
    },
    show: (direction: 'right' | 'left' | 'none') => {
        if (direction === 'none') {
            return {};
        }
        return {
            x: 0,
            opacity: 1,
        }
    },
    hide: (direction: 'right' | 'left' | 'none') => {
        if (direction === 'left') {
            return {
                x: '35%',
                opacity: 0,
            };
        } else if (direction === 'right') {
            return {
                x: '-35%',
                opacity: 0,
            };
        } else {
            return {};
        }
    },
};