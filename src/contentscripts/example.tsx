import { AnnoyingPopup } from '@components/AnnoyingPopup';
import { injectComponent } from 'inject-react-anywhere';
import v18 from 'inject-react-anywhere/v18';
import txt from '@assets/test.txt';
import txtEmbedded from '@assets/test.txt?raw';
import { loadTextAsset } from '@utils/network';

const main = async () => {
    const txtAssetContent = await loadTextAsset(txt);
    const controller = await injectComponent(
        AnnoyingPopup,
        {
            content: (
                <div>
                    <p>This is demonstration of content script which injects React component on 3rd party site.</p>
                    <p>{txtAssetContent}</p>
                    <p>This is same content, but emedded directly in source code:</p>
                    <p>{txtEmbedded}</p>
                </div>
            ),
        },
        {
            mountStrategy: v18,
        }
    );

    document.body.append(controller.shadowHost);
};

main();
