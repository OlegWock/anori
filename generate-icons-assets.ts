import { locate, lookupCollection } from '@iconify/json';
import { IconSet, exportToDirectory } from '@iconify/tools';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

type IconifyJSON = Awaited<ReturnType<typeof lookupCollection>>;

const main = async () => {
    const ICON_SETS_TO_LOAD = [
        'ion',
        'fluent',
        'ic',
        'jam',
        'fluent-emoji-flat',
        'twemoji',
        'flat-color-icons',
        'logos',
        'skill-icons',
        'vscode-icons',
        'circle-flags',
        'flagpack',
        'wi',
    ];

    const SAVE_TO = join(__dirname, 'src/assets/icons');
    const SAVE_TO_CATALOG = join(__dirname, 'src/components/icons');

    const sets = ICON_SETS_TO_LOAD.map((setName, i, arr) => {
        console.log('Loading set', setName, `${i + 1}/${arr.length}`);
        const jsonPath = locate(setName);
        const iconsJson = readFileSync(jsonPath, { encoding: 'utf-8' });
        const data = JSON.parse(iconsJson) as IconifyJSON;
        return {
            name: setName,
            jsonPath,
            data,
        }
    });

    const promises = sets.map(async (set, i, arr) => {
        console.log('Processing set', set.name, `${i + 1}/${arr.length}`);
        const distFolder = join(SAVE_TO, `${set.data.prefix}`);
        const iconSet = new IconSet(set.data);
        await exportToDirectory(iconSet, {
            target: distFolder
        })
    });

    await Promise.all(promises);

    const allSetsTs = `
//////////////////////////////////////////////////////////////////
//////// THIS FILE IS GENERATED AUTOMATICALLY DO NOT EDIT ////////
////// TO MODIFY THIS FILE HEAD TO generate-icons-assets.ts //////
//////////////////////////////////////////////////////////////////

import { CUSTOM_ICONS_AVAILABLE } from '@utils/custom-icons';
import { translate } from '@translations/index';

export const allSets = [\n${sets.map(s => `    ${JSON.stringify(s.name)}, // https://icon-sets.iconify.design/${s.name}/`).join('\n')},\n];

export const iconSetPrettyNames: Record<string, string> = {
${sets.map(s => `    '${s.name}': ${JSON.stringify(s.data.info!.name)},`).join('\n')}
} as const;

if (CUSTOM_ICONS_AVAILABLE) {
    // Icons uploaded by user
    allSets.push('custom');
    Object.defineProperty(iconSetPrettyNames, 'custom', {
        get: () => translate('customIcons')
    });
}
`

    const iconsBySet: Record<string, string[]> = {};
    sets.forEach(s => {
        iconsBySet[s.name] = Object.keys(s.data.icons);
    });
    writeFileSync(
        join(SAVE_TO, `meta.json`),
        JSON.stringify(iconsBySet),
    );

    console.log('Saving all-sets.ts');
    writeFileSync(
        join(SAVE_TO_CATALOG, `all-sets.ts`),
        allSetsTs,
    );

    console.log('All done!');
}
main();