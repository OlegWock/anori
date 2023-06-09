import * as path from 'path';
import * as fs from 'fs';
import * as walkSync from 'walk-sync';
import * as webpack from 'webpack';
import * as TerserPlugin from 'terser-webpack-plugin';
// @ts-ignore No declarations for this module!
import * as GenerateFiles from 'generate-file-webpack-plugin';
import * as CopyPlugin from 'copy-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import * as MomentTimezoneDataPlugin from 'moment-timezone-data-webpack-plugin';
// eslint-disable-next-line unused-imports/no-unused-imports
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import * as FileManagerPlugin from 'filemanager-webpack-plugin';
import {
    Chunk,
    createPathsObject,
    joinPath,
    scriptName,
    shouldNotBeInCommonChunk,
    pathRelatedToExtRoot,
    generatePageContentForScript,
    generateBackgroundWorkerWrapper,
    isUiRelated,
    CacheGroup,
    scriptExtensions,
} from './build_helpers/webpack-utils';
import type { Manifest } from 'webextension-polyfill';
import { version, name, author } from './package.json';
const currentYear = new Date().getFullYear();

/* eslint-disable @typescript-eslint/no-unused-vars */

interface WebpackEnvs {
    WEBPACK_WATCH: boolean;
    mode?: 'development' | 'production';
    targetBrowser?: 'chrome' | 'chrome-all-permissions' | 'firefox' | 'safari';
}

const generateManifest = (
    mode: Exclude<WebpackEnvs['mode'], undefined>,
    targetBrowser: Exclude<WebpackEnvs['targetBrowser'], undefined>,
    libsRoot: string,
    commonChunks: { [name: string]: Chunk }
): Manifest.WebExtensionManifest => {
    const manifest: Manifest.WebExtensionManifest = {
        name: '__MSG_appName__',
        description: '__MSG_appDescription__',
        version: version,
        author: author,
        manifest_version: 3,
        default_locale: "en",
        action: {
            default_title: '__MSG_appActionTitle__'
        },
        minimum_chrome_version: "104",
        background: {
            service_worker: 'background-wrapper.js',
        },
        icons: {
            '48': 'assets/images/icon48.png',
            '128': 'assets/images/icon128.png',
        },
        permissions: [
            'alarms',
            'storage',
            'unlimitedStorage',
            'sessions',
            'system.cpu',
            'system.memory',
        ],
        host_permissions: [] as string[],
        optional_permissions: [
            'tabs',
            'favicon',
            'topSites',
            'bookmarks',
            'tabGroups',
        ],
        optional_host_permissions: [
            "*://*/*"
        ],

        chrome_url_overrides: {
            newtab: "pages/newtab/start.html"
        },
        web_accessible_resources: [
            {
                resources: ['/assets/*'],
                matches: ['<all_urls>'],
                use_dynamic_url: true,
            },
            {
                resources: ["_favicon/*"],
                matches: ["<all_urls>"],
                use_dynamic_url: true,
            }
        ],
    };

    if (targetBrowser === 'chrome-all-permissions') {
        manifest.permissions = [
            ...manifest.permissions!,
            ...manifest.optional_permissions!,
        ];
        manifest.optional_permissions = [];

        manifest.host_permissions = [
            ...manifest.host_permissions!,
            ...manifest.optional_host_permissions!,
        ];
        manifest.optional_host_permissions = [];
    }

    // Chrome (with manifest v3) treated as default platform. So, need to patch it for Firefox manifest v2
    if (targetBrowser === 'firefox' || targetBrowser === 'safari') {
        const unavailablePermissions = [
            'system.cpu',
            'system.memory',
            'favicon',
            'tabGroups',
        ];

        const additionalPermissions: string[] = [];

        manifest.manifest_version = 2;

        manifest.browser_action = manifest.action;
        delete manifest.action;

        delete manifest.host_permissions;
        delete manifest.minimum_chrome_version;

        manifest.optional_permissions = [
            ...manifest.optional_permissions!,
            ...manifest.optional_host_permissions!,
        ];

        delete manifest.optional_host_permissions;

        manifest.permissions = [
            ...manifest.permissions!.filter(p => !unavailablePermissions.includes(p)),
            ...additionalPermissions
        ];
        manifest.optional_permissions = manifest.optional_permissions!.filter(p => !unavailablePermissions.includes(p));

        manifest.background = {
            "persistent": false,
            "scripts": [
                `${libsRoot}/other.js`,
                `${libsRoot}/ui.js`,
                "background.js"
            ]
        };

        manifest.web_accessible_resources = manifest.web_accessible_resources!.flatMap(descriptor => {
            return (descriptor as Manifest.WebExtensionManifestWebAccessibleResourcesC2ItemType).resources;
        });

        if (targetBrowser === 'firefox') {
            manifest.browser_specific_settings = {
                gecko: {
                    strict_min_version: "99.0"
                }
            };
        }

        if (targetBrowser === 'safari') {
            manifest.browser_url_overrides = manifest.chrome_url_overrides;
            delete manifest.chrome_url_overrides;
        }
    }

    return manifest;
};

const baseSrc = './src';
const baseDist = './dist';

const config = async (env: WebpackEnvs): Promise<webpack.Configuration> => {
    const commonChunks: { [name: string]: Chunk } = {
        ui: {
            test: (module, context) => {
                const name = module.nameForCondition();
                if (!name) return false;
                const absBase = path.resolve(__dirname);
                const relativePath = name.replace(absBase, '.').toLowerCase();
                if (shouldNotBeInCommonChunk(relativePath, entries)) return false;
                return isUiRelated(relativePath);
            },
        },
        other: {
            test: (module, context) => {
                const name = module.nameForCondition();
                if (!name) return false;
                const absBase = path.resolve(__dirname);
                const relativePath = name.replace(absBase, '.').toLowerCase();
                if (shouldNotBeInCommonChunk(relativePath, entries)) return false;
                return !isUiRelated(relativePath);
            },
        },
    } as const;

    const { mode = 'development', targetBrowser = 'chrome', WEBPACK_WATCH } = env;

    const paths = createPathsObject(
        baseSrc,
        targetBrowser === 'safari' ? `./safari-app/anori/Shared (Extension)/Resources` : joinPath(baseDist, targetBrowser)
    );

    const pageTemplate = fs.readFileSync(paths.src.pageHtmlTemplate, {
        encoding: 'utf-8',
    });

    const entries: { [id: string]: string } = {
        backgroundScript: paths.src.background,
    };
    const outputs: { [id: string]: string } = {
        backgroundScript: paths.dist.background,
    };

    const libsRoot = pathRelatedToExtRoot(paths, 'libs');

    const generateFileInvocations: GenerateFiles[] = [];

    const pages = walkSync(paths.src.pages, {
        globs: scriptExtensions.map((ext) => '**/*' + ext),
        ignore: scriptExtensions.map((ext) => '**/components/**/*' + ext),
        directories: false,
    });
    console.log('Pages:', pages);
    pages.forEach((page) => {
        const cleanName = scriptName(page);
        entries[cleanName] = joinPath(paths.src.pages, page);
        outputs[cleanName] = joinPath(paths.dist.pages, cleanName + '.js');

        const scriptsToInject = [
            ...Object.keys(commonChunks).map((name) => `${libsRoot}/${name}.js`),
            `/${paths.dist.pages}/${cleanName}.js`,
        ];

        generateFileInvocations.push(
            new GenerateFiles({
                file: joinPath(paths.dist.pages, `${cleanName}.html`),
                content: generatePageContentForScript(pageTemplate, {
                    scripts: scriptsToInject
                        .map((url) => {
                            return `<script src="${url}" async></script>`;
                        })
                        .join('\n'),
                }),
            })
        );
    });


    const contentscripts = walkSync(paths.src.contentscripts, {
        globs: scriptExtensions.map((ext) => '**/*' + ext),
        directories: false,
    });
    console.log('Content scripts:', contentscripts);
    contentscripts.forEach((cs) => {
        const cleanName = scriptName(cs);
        entries[cleanName] = joinPath(paths.src.contentscripts, cs);
        outputs[cleanName] = joinPath(paths.dist.contentscripts, cleanName + '.js');
    });

    const cacheGroups: { [name: string]: CacheGroup } = {};
    Object.entries(commonChunks).forEach(([name, entry]) => {
        cacheGroups[name] = {
            ...entry,
            name: name,
            priority: 10,
            filename: joinPath(paths.dist.libs, `${name}.js`),
            chunks: 'all',
            reuseExistingChunk: false,
            enforce: true,
        };
    });

    // @ts-expect-error There is some issue with types provided with FileManagerPlugin and CJS/ESM imports
    let zipPlugin: FileManagerPlugin[] = [];
    if (!WEBPACK_WATCH && targetBrowser !== 'safari') {
        zipPlugin = [
            // @ts-expect-error Same as above
            new FileManagerPlugin({
                events: {
                    onEnd: {
                        archive: [
                            {
                                source: paths.dist.base,
                                destination: `${baseDist}/${name}-${targetBrowser}-${mode}-v${version}.zip`,
                            },
                        ],
                    },
                },
            }),
        ];
    }

    const babelOptions = {
        presets: [
            ['@babel/preset-env', {}],
            [
                '@babel/preset-react',
                {
                    runtime: 'automatic',
                    development: mode === 'development',
                },
            ],
        ],
    };

    return {
        mode: mode,
        devtool: mode === 'development' ? 'inline-source-map' : false,
        resolve: {
            alias: {
                '@utils': path.resolve(__dirname, paths.src.utils),
                '@components': path.resolve(__dirname, paths.src.components),
                '@assets': path.resolve(__dirname, paths.src.assets),
                '@plugins': path.resolve(__dirname, paths.src.plugins),
                '@translations': path.resolve(__dirname, paths.src.translations),

                // This by default resolves to version for browser, which then breaks background worker
                'decode-named-character-reference': path.resolve(__dirname, 'node_modules/decode-named-character-reference/index.js'),
            },
            aliasFields: ['browser', 'worker'],

            modules: [path.resolve(__dirname, paths.src.base), 'node_modules'],
            extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
        },

        entry: entries,
        output: {
            filename: (pathData) => {
                if (!pathData.chunk?.name) {
                    throw new Error(
                        'Unexpected chunk. Please make sure that all source files belong to ' +
                        'one of predefined chunks or are entrypoints'
                    );
                }
                return outputs[pathData.chunk.name];
            },
            path: path.resolve(__dirname, paths.dist.base),
            publicPath: '/',
        },

        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    resourceQuery: { not: [/raw/] },
                    include: path.resolve(__dirname, paths.src.base),
                    use: [
                        {
                            loader: 'babel-loader',
                            options: babelOptions,
                        },
                        {
                            loader: 'ts-loader',
                        },
                    ],
                },
                {
                    test: /\.(js|jsx)$/,
                    resourceQuery: { not: [/raw/] },
                    include: path.resolve(__dirname, paths.src.base),
                    exclude: /icons\/sets/,
                    use: {
                        loader: 'babel-loader',
                        options: babelOptions,
                    },
                },
                {
                    test: /\.s[ac]ss$/i,
                    resourceQuery: { not: [/raw/] },
                    use: [
                        {
                            loader: 'style-loader',
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                url: false,
                            }
                        },
                        {
                            loader: 'sass-loader',
                        },
                    ],
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: 'style-loader',
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                url: false,
                            }
                        },
                    ],
                },
                // More info: https://github.com/webextension-toolbox/webextension-toolbox/blob/master/src/webpack-config.js#L128
                // Using 'self' instead of 'window' so it will work in Service Worker context
                // {
                // test: /webextension-polyfill[\\/]+dist[\\/]+browser-polyfill\.js$/,
                // loader: require.resolve('string-replace-loader'),
                // options: {
                // search: 'typeof browser === "undefined"',
                // replace:
                // 'typeof self.browser === "undefined" || Object.getPrototypeOf(self.browser) !== Object.prototype',
                // },
                // },
                {
                    include: path.resolve(__dirname, paths.src.assets),
                    loader: 'file-loader',
                    resourceQuery: { not: [/raw/] },
                    options: {
                        name: '[path][name].[ext]',
                        context: paths.src.base,
                        postTransformPublicPath: (publicPath: string) =>
                            `(typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(${publicPath});`,
                    },
                },
                {
                    resourceQuery: /raw/,
                    type: 'asset/source',
                },
            ],
        },

        plugins: [
            // new BundleAnalyzerPlugin(),

            // output.clean option deletes assets generated by plugins (e.g. manifest file or .html files), so using
            // CleanWebpackPlugin directly to work around this
            new CleanWebpackPlugin({
                cleanOnceBeforeBuildPatterns: ['**/*'],
            }),
            new webpack.DefinePlugin({
                X_MODE: JSON.stringify(mode),
                X_BROWSER: JSON.stringify(targetBrowser),
            }),
            ...generateFileInvocations,

            // We use wrapper to load common chunks before main script
            new GenerateFiles({
                file: 'background-wrapper.js',
                content: generateBackgroundWorkerWrapper([`${libsRoot}/ui.js`, `${libsRoot}/other.js`, `background.js`]),
            }),
            new GenerateFiles({
                file: paths.dist.manifest,
                content: JSON.stringify(generateManifest(mode, targetBrowser, libsRoot, commonChunks), null, 4),
            }),
            // Part of files will be already copied by browser-runtime-geturl-loader, but not all (if you don't
            // import asset in code, it's not copied), so we need to do this with addiitonal plugin
            new CopyPlugin({
                patterns: [
                    {
                        from: `**`,
                        context: paths.src.assets,
                        to: ({ context, absoluteFilename }) => {
                            const assetAbsolutePath = path.resolve(paths.src.assets);
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            return path.join(paths.dist.assets, absoluteFilename!.replace(assetAbsolutePath, ''));
                        },
                    },
                    {
                        from: `**`,
                        context: paths.src.locales,
                        to: ({ context, absoluteFilename }) => {
                            const assetAbsolutePath = path.resolve(paths.src.locales);
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            return path.join(paths.dist.locales, absoluteFilename!.replace(assetAbsolutePath, ''));
                        },
                    },
                ],
            }),
            new MomentTimezoneDataPlugin({
                startYear: currentYear - 2,
                endYear: currentYear + 5,
            }),
            // TODO: need to include only locales we support in the extension
            // new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }),
            ...zipPlugin,
        ],

        optimization: {
            minimizer: [
                new TerserPlugin({
                    extractComments: false,
                    terserOptions: {
                        compress: {
                        },
                        // Uncomment if Chrome store rejects update
                        // mangle: false,
                        output: {
                            // Uncomment if Chrome store rejects update
                            // beautify: true,
                        },

                        // Uncomment for profiling production build
                        // keep_classnames: true,
                        // keep_fnames: true,
                    },
                }),
            ],

            splitChunks: {
                chunks: 'all',
                cacheGroups,
            },
        },
    };
};

export default config;
