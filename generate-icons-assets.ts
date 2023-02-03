import { locate } from '@iconify/json';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

const ICON_SETS_TO_LOAD = [
    'ion',
    'ic',
    'fluent-emoji',
    'fluent-emoji-flat',
    'twemoji',
    'logos',
    'skill-icons',
    'circle-flags',
    'flagpack',
];

const SAVE_TO = join(__dirname, 'src/assets/icons');
const SAVE_TO_CATALOG = join(__dirname, 'src/components/icons');


const sets = ICON_SETS_TO_LOAD.map((setName, i , arr) => {
    console.log('Loading set', setName, `${i+1}/${arr.length}`);
    const jsonPath = locate(setName);
    const iconsJson = readFileSync(jsonPath, {encoding: 'utf-8'});
    const data = JSON.parse(iconsJson);
    return {
        name: setName,
        jsonPath,
        data,
    }
});

sets.forEach((set, i, arr) => {
    console.log('Saving set', set.name, `${i+1}/${arr.length}`);
    const minifiedJson = JSON.stringify(set.data, null, 4);
    writeFileSync(
        join(SAVE_TO, `${set.name}.json`),
        minifiedJson,
    );
});


const allSetsTs = `
export const allSets = [\n${sets.map(s => `    ${JSON.stringify(s.name)}, // https://icon-sets.iconify.design/${s.name}/`).join('\n')}\n];

export const iconSetPrettyNames: Record<string, string> = {
${sets.map(s => `    '${s.name}': ${JSON.stringify(s.data.info.name)},`).join('\n')}
} as const;

export const iconsBySet: Record<string, string[]> = {
    ${sets.map(s => `'${s.name}': ${JSON.stringify(Object.keys(s.data.icons))},`).join('\n\n// ------------------ \n\n')}
};
`

console.log('Saving all-sets.ts');
writeFileSync(
    join(SAVE_TO_CATALOG, `all-sets.ts`),
    allSetsTs,
);

console.log('All done!');