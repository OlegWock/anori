export const guid = () => {
    // guid()
    // => "563befe9-405e-0e52-6779-9fad2f181678"
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

export const wait = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(() => resolve(), ms));
};

export const parseHost = (url: string) => {
    try {
        return new URL(url).hostname;
    } catch (err) {
        return `Couldn't parse hostname`
    }
};