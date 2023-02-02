import * as path from 'path';
import * as webpack from 'webpack';

// Webpack doesn't export this type, so let's extract it ourselfs!
type CacheGroups = Exclude<
    Exclude<Exclude<webpack.Configuration['optimization'], undefined>['splitChunks'], undefined | false>['cacheGroups'],
    undefined
>;
// eslint-disable-next-line @typescript-eslint/ban-types
export type CacheGroup = Exclude<CacheGroups[keyof CacheGroups], string | false | Function | RegExp>;

type BetterCacheGroupTest =
    // eslint-disable-next-line @typescript-eslint/ban-types
    | Exclude<CacheGroup['test'], Function>
    | ((
          module: webpack.Module,
          {
              chunkGraph,
              moduleGraph,
          }: {
              chunkGraph: webpack.ChunkGraph;
              moduleGraph: webpack.ModuleGraph;
          }
      ) => boolean);

export interface Chunk {
    test: BetterCacheGroupTest;
}

export const scriptExtensions = ['.tsx', '.jsx', '.ts', '.js'];

export const isScript = (filename: string) => scriptExtensions.some((ext) => filename.endsWith(ext));

export const scriptName = (filename: string) =>
    scriptExtensions.reduce((name, extension) => name.replace(extension, ''), filename);

export const joinPath = (...args: string[]) => {
    // preserve dot on start of path
    const hasDot = args.length && args[0].startsWith('./');
    const res = path.join(...args);
    if (hasDot) return './' + res;
    return res;
};

export const pathRelatedToExtRoot = <T extends keyof ReturnType<typeof createPathsObject>['dist']>(
    paths: ReturnType<typeof createPathsObject>,
    prop: T
): string => {
    return (
        `/` +
        (paths.dist[prop].startsWith(paths.dist.base)
            ? paths.dist[prop].substring(paths.dist.base.length + 1)
            : paths.dist[prop])
    );
};

export const createPathsObject = (baseSrc: string, baseDist: string) => {
    return {
        src: {
            base: baseSrc,
            background: joinPath(baseSrc, 'background.ts'),
            contentscripts: joinPath(baseSrc, 'contentscripts'),
            pages: joinPath(baseSrc, 'pages'),
            pageHtmlTemplate: './build_helpers/page_template.html',

            utils: joinPath(baseSrc, 'utils'),
            components: joinPath(baseSrc, 'components'),
            assets: joinPath(baseSrc, 'assets'),
        },
        dist: {
            base: baseDist,
            background: 'background.js',
            contentscripts: 'contentscripts',
            pages: 'pages',
            libs: 'libs',
            assets: 'assets',

            manifest: 'manifest.json',
        },
    };
};

export const generatePageContentForScript = (pageTemplate: string, substitutions: { [key: string]: string }) => {
    let result = pageTemplate;
    for (const key of Object.keys(substitutions)) {
        const value = substitutions[key];
        result = result.replace(`[[${key}]]`, value);
    }
    return result;
};

export const shouldNotBeInCommonChunk = (relativePath: string, entires: { [id: string]: string }) => {
    return Object.values(entires).includes(relativePath);
};

export const generateBackgroundWorkerWrapper = (scripts: string[]) => {
    return `try { importScripts(${scripts.map((sc) => `"${sc}"`).join(', ')}); } catch (e) {console.log(e);}\n`;
};

export const isUiRelated = (name: string) => {
    return name.includes('react') || name.includes('jquery') || name.includes('/components/');
};
