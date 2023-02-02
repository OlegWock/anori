/* eslint-disable @typescript-eslint/no-unused-vars */
import * as browser from 'webextension-polyfill';

declare module 'webextension-polyfill' {
    namespace Manifest {
        interface WebExtensionManifestWebAccessibleResourcesC2ItemType {
            use_dynamic_url?: boolean;
        }
    }
}
