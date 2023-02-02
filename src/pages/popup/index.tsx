import { injectStyles, mountPage } from '@utils/mount';
import logo from '@assets/images/icon128.png';
import style from './styles.scss';

const Popup = () => {
    return (
        <div className="Popup">
            <img src={logo} />
            <div className="text-wrapper">Hello! I'm extension's popup. Nice to meet you.</div>
        </div>
    );
};

injectStyles([style]);
mountPage(<Popup />);
