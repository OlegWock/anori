export const loadTextAsset = async (url: string): Promise<string> => {
    const response = await fetch(url);
    return response.text();
};
