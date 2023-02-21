import './OnboardingCard.scss';
import { WidgetCard } from './WidgetCard';

export const OnboardingCard = () => {
    return (
        <WidgetCard
            width={4}
            height={3}
            withAnimation={false}
        >
            <div className="OnboardingCard">
                <h2>Fresh start, huh?</h2>
                <div>
                    Hello! I'm onboarding card, and my mission here is to help you set up your perfect new tab.
                </div>
                <div>
                    Click on pencil in top right corner. This will switch the page into editing mode. Here you can add new widgets and reposition or remove existing ones.
                </div>
                <div>
                    If you click on the gear icon in the bottom left corner, you'll open settings. There you can manage your folders (which you find on the sidebar to the left) and change theme.
                </div>
                <div>
                    Oh, and we also have a command menu for quick access. Just hit Cmd+K on Mac or Ctrl+K on Windows/Linux.
                </div>
                <div>
                    This card will disappear once you add your first widget.
                </div>
            </div>
        </WidgetCard>
    );
};