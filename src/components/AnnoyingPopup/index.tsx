import { ReactNode } from 'react';
import { createInjectableComponent } from 'inject-react-anywhere';
import logo from '@assets/images/icon128.png';
import styles from './styles.scss';

interface AnnoyingPopupProps {
    content: ReactNode;
}

const AnnoyingPopupComponent = ({ content }: AnnoyingPopupProps) => {
    return (
        <div className="AnnoyingPopup">
            <img src={logo} />
            {content}
        </div>
    );
};

export const AnnoyingPopup = createInjectableComponent(AnnoyingPopupComponent, {
    styles: [styles],
});
