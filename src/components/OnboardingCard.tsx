import { Trans, useTranslation } from 'react-i18next';
import './OnboardingCard.scss';
import { ShortcutHint } from './ShortcutHint';
import { WidgetCard } from './WidgetCard';

export const OnboardingCard = () => {
    const { t } = useTranslation();

    return (
        <WidgetCard
            width={4}
            height={3}
            withAnimation={false}
        >
            <div className="OnboardingCard">
                <h2>{t('onboarding.title')}</h2>
                <div>{t('onboarding.p1')}</div>
                <div>{t('onboarding.p2')}</div>
                <div>{t('onboarding.p3')}</div>
                <div>
                    <Trans t={t} i18nKey="onboarding.p4">
                        <ShortcutHint shortcut='meta+k' /><ShortcutHint shortcut='alt+h' />
                    </Trans>
                </div>
                <div>{t('onboarding.p5')}</div>
            </div>
        </WidgetCard>
    );
};