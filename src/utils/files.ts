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
    const aElement = document.createElement('a');
    aElement.setAttribute('download', name);
    const href = URL.createObjectURL(blob);
    aElement.href = href;
    aElement.setAttribute('target', '_blank');
    aElement.click();
    URL.revokeObjectURL(href);
};