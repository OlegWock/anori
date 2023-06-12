import { useScheduledRender } from "@utils/hooks";
import { Moment } from "moment-timezone";
import { useTranslation } from "react-i18next";


const seconds = (n: number) => n * 1000;

const minutes = (n: number) => seconds(n) * 60;

const hours = (n: number) => minutes(n) * 60;

const delayByTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;

    if (diff < seconds(60)) return seconds(5);
    if (diff < minutes(60)) return minutes(1);
    if (diff < hours(24)) return hours(1);

    return 0;
};

export const RelativeTime = ({ m, withoutSuffix }: { m: Moment, withoutSuffix?: boolean }) => {
    const scheduleRerender = useScheduledRender();
    useTranslation();

    const delay = delayByTimestamp(m.valueOf());
    if (delay) {
        scheduleRerender(delay);
    }

    return <>{m.fromNow(withoutSuffix)}</>;
};