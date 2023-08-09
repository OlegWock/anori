export const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play();
};