export const showOpenFilePicker = (multiple = false, accept?: string): Promise<File[]> => {
    return new Promise<File[]>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (multiple) input.multiple = true;
        if (accept) input.accept = accept;
        input.addEventListener('change', (e) => {
            resolve(Array.from((e.target as HTMLInputElement).files!));
        });

        input.click();
    });
};

export const downloadTextFile = (name: string, content: string) => {
    downloadBlob(name, new Blob([content], {
        type: 'text/plain'
    }));
};

export const downloadBlob = (name: string, blob: Blob) => {
    // Doesn't work is Safari
    // https://bugs.webkit.org/show_bug.cgi?id=226440
    const aElement = document.createElement('a');
    aElement.setAttribute('download', name);
    const href = URL.createObjectURL(blob);
    aElement.setAttribute('href', href);
    aElement.setAttribute('target', '_blank');

    setTimeout(() => {
        aElement.dispatchEvent(new MouseEvent('click'))
    }, 0);
    setTimeout(() => {
        URL.revokeObjectURL(href);
    }, 1000 * 40);
};