import { injectStyles, mountPage, setPageTitle } from '@utils/mount';

import style from './styles.scss';

const Options = () => {
    return <div className="Options">Hello! I'm extension's options page. Nice to meet you.</div>;
};

injectStyles([style]);
mountPage(<Options />);
setPageTitle('Options');
