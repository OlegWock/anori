import * as fs from "node:fs";
import * as path from "node:path";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import * as CopyPlugin from "copy-webpack-plugin";
import * as FileManagerPlugin from "filemanager-webpack-plugin";
// @ts-ignore No declarations for this module!
// @ts-ignore No declarations for this module!
import * as GenerateFiles from "generate-file-webpack-plugin";
// @ts-ignore No declarations for this module!
import * as MomentLocalesPlugin from "moment-locales-webpack-plugin";
import * as MomentTimezoneDataPlugin from "moment-timezone-data-webpack-plugin";
import * as SpeedMeasurePlugin from "speed-measure-webpack-plugin";
import * as TerserPlugin from "terser-webpack-plugin";
import * as walkSync from "walk-sync";
import type { Manifest } from "webextension-polyfill";
import * as webpack from "webpack";
import WebExtensionChuckLoaderRuntimePlugin from "./build_helpers/dynamic_import_plugin/ChunkLoader";
import ServiceWorkerEntryPlugin from "./build_helpers/dynamic_import_plugin/ServiceWorkerPlugin";
import {
  createPathsObject,
  generatePageContentForScript,
  joinPath,
  scriptExtensions,
  scriptName,
} from "./build_helpers/webpack-utils";
import { author, name, version } from "./package.json";
const currentYear = new Date().getFullYear();

/* eslint-disable @typescript-eslint/no-unused-vars */

const smp = new SpeedMeasurePlugin({
  outputFormat: "humanVerbose",
});

interface WebpackEnvs {
  WEBPACK_WATCH: boolean;
  mode?: "development" | "production";
  targetBrowser?: "chrome" | "chrome-all-permissions" | "firefox" | "safari";
}

const generateManifest = (
  mode: Exclude<WebpackEnvs["mode"], undefined>,
  targetBrowser: Exclude<WebpackEnvs["targetBrowser"], undefined>,
  paths: ReturnType<typeof createPathsObject>,
): Manifest.WebExtensionManifest => {
  const manifest: Manifest.WebExtensionManifest = {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    version: version,
    author: author,
    manifest_version: 3,
    default_locale: "en",
    action: {
      default_title: "__MSG_appActionTitle__",
    },
    minimum_chrome_version: "104",
    background: {
      service_worker: "background.js",
    },
    icons: {
      "48": "assets/images/icon48.png",
      "128": "assets/images/icon128.png",
    },
    permissions: ["alarms", "storage", "unlimitedStorage", "sessions", "system.cpu", "system.memory"],
    host_permissions: [] as string[],
    optional_permissions: [
      "tabs",
      "favicon",
      "topSites",
      "bookmarks",
      "tabGroups",
      "declarativeNetRequestWithHostAccess",
      "browsingData",
    ],
    optional_host_permissions: ["*://*/*"],

    chrome_url_overrides: {
      newtab: "/pages/newtab/start.html",
    },
    web_accessible_resources: [
      {
        resources: [`/${paths.dist.assets}/*`],
        matches: ["<all_urls>"],
        use_dynamic_url: true,
      },
      {
        resources: [`/${paths.dist.chunks}/*`],
        matches: ["<all_urls>"],
        use_dynamic_url: true,
      },
    ],
  };

  if (mode === "development") {
    manifest.permissions?.push("declarativeNetRequestFeedback");
  }

  if (targetBrowser === "chrome-all-permissions") {
    manifest.permissions = [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])];
    manifest.optional_permissions = [];

    manifest.host_permissions = [...(manifest.host_permissions ?? []), ...(manifest.optional_host_permissions ?? [])];
    manifest.optional_host_permissions = [];
  }

  // Chrome (with manifest v3) treated as default platform. So, need to patch it for Firefox manifest v2
  if (targetBrowser === "firefox" || targetBrowser === "safari") {
    const unavailablePermissions = [
      "system.cpu",
      "system.memory",
      "favicon",
      "tabGroups",
      "declarativeNetRequestWithHostAccess",
    ];

    const additionalPermissions: string[] = [];

    if (targetBrowser === "safari") {
      additionalPermissions.push("nativeMessaging"); // Might want to talk with native companion app
    }

    manifest.manifest_version = 2;

    manifest.browser_action = manifest.action;
    manifest.action = undefined;

    manifest.host_permissions = undefined;
    manifest.minimum_chrome_version = undefined;

    manifest.optional_permissions = [
      ...(manifest.optional_permissions ?? []),
      ...(manifest.optional_host_permissions ?? []),
    ];

    manifest.optional_host_permissions = undefined;

    manifest.permissions = [
      ...(manifest.permissions?.filter((p) => !unavailablePermissions.includes(p)) ?? []),
      ...additionalPermissions,
    ];
    manifest.optional_permissions = manifest.optional_permissions?.filter((p) => !unavailablePermissions.includes(p));

    manifest.background = {
      persistent: false,
      scripts: ["background.js"],
    };

    manifest.web_accessible_resources = manifest.web_accessible_resources?.flatMap((descriptor) => {
      return (descriptor as Manifest.WebExtensionManifestWebAccessibleResourcesC2ItemType).resources;
    });

    if (targetBrowser === "firefox") {
      manifest.browser_specific_settings = {
        gecko: {
          strict_min_version: "99.0",
        },
      };
    }

    if (targetBrowser === "safari") {
      manifest.browser_url_overrides = manifest.chrome_url_overrides;
      manifest.chrome_url_overrides = undefined;
    }
  }

  if (targetBrowser === "firefox") {
    manifest.optional_permissions?.push("webRequest", "webRequestBlocking");

    // Despite the name this seem to work only in Firefox (for Chrome new tab page and home page are the same)
    manifest.chrome_settings_overrides = {
      homepage: "pages/newtab/start.html",
    };
  }

  return manifest;
};

const baseSrc = "./src";
const baseDist = "./dist";
const config = async (env: WebpackEnvs): Promise<webpack.Configuration> => {
  const { mode = "development", targetBrowser = "chrome", WEBPACK_WATCH } = env;

  const paths = createPathsObject(
    baseSrc,
    targetBrowser === "safari" ? `./safari-app/anori/Shared (Extension)/Resources` : joinPath(baseDist, targetBrowser),
  );

  const pageTemplate = fs.readFileSync(paths.src.pageHtmlTemplate, {
    encoding: "utf-8",
  });

  const entries: webpack.Configuration["entry"] = {
    backgroundScript: paths.src.background,
  };
  const outputs: { [id: string]: string } = {
    backgroundScript: paths.dist.background,
  };

  const generateFileInvocations: GenerateFiles[] = [];

  const pages = walkSync(paths.src.pages, {
    globs: scriptExtensions.map((ext) => `*/*${ext}`),
    ignore: scriptExtensions.map((ext) => `**/components/**/*${ext}`),
    directories: false,
  });
  console.log("Pages:", pages);
  pages.forEach((page) => {
    const cleanName = scriptName(page);
    entries[cleanName] = joinPath(paths.src.pages, page);
    outputs[cleanName] = joinPath(paths.dist.pages, `${cleanName}.js`);

    const scriptsToInject = [`/${paths.dist.pages}/${cleanName}.js`];

    generateFileInvocations.push(
      new GenerateFiles({
        file: joinPath(paths.dist.pages, `${cleanName}.html`),
        content: generatePageContentForScript(pageTemplate, {
          scripts: scriptsToInject
            .map((url) => {
              return `<script src="${url}" async></script>`;
            })
            .join("\n"),
        }),
      }),
    );
  });

  const contentscripts = walkSync(paths.src.contentscripts, {
    globs: scriptExtensions.map((ext) => `**/*${ext}`),
    directories: false,
  });
  console.log("Content scripts:", contentscripts);
  contentscripts.forEach((cs) => {
    const cleanName = scriptName(cs);
    entries[cleanName] = joinPath(paths.src.contentscripts, cs);
    outputs[cleanName] = joinPath(paths.dist.contentscripts, `${cleanName}.js`);
  });

  const scripts = walkSync(paths.src.scripts, {
    globs: scriptExtensions.map((ext) => `**/*${ext}`),
    directories: false,
  });
  console.log("Scripts:", scripts);
  scripts.forEach((cs) => {
    const cleanName = scriptName(cs);

    entries[cleanName] = {
      import: joinPath(paths.src.scripts, cs),
      chunkLoading: false,
    };
    outputs[cleanName] = joinPath(paths.dist.scripts, `${cleanName}.js`);
  });

  // @ts-expect-error There is some issue with types provided with FileManagerPlugin and CJS/ESM imports
  let zipPlugin: FileManagerPlugin[] = [];
  if (!WEBPACK_WATCH && targetBrowser !== "safari") {
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
      [
        "@babel/preset-env",
        {
          targets: {
            chrome: 104,
            firefox: 99,
            safari: 14,
          },
        },
      ],
      [
        "@babel/preset-react",
        {
          runtime: "automatic",
          development: mode === "development",
        },
      ],
    ],
  };

  const config: webpack.Configuration = {
    mode: mode,
    devtool: false,
    resolve: {
      alias: {
        "@utils": path.resolve(__dirname, paths.src.utils),
        "@components": path.resolve(__dirname, paths.src.components),
        "@assets": path.resolve(__dirname, paths.src.assets),
        "@plugins": path.resolve(__dirname, paths.src.plugins),
        "@translations": path.resolve(__dirname, paths.src.translations),

        // This by default resolves to version for browser, which then breaks background worker
        "decode-named-character-reference": path.resolve(
          __dirname,
          "node_modules/decode-named-character-reference/index.js",
        ),
      },
      aliasFields: ["browser", "worker"],

      fallback: {
        // Required for rss-parser
        http: false,
        https: false,
        url: require.resolve("url/"),
        timers: require.resolve("timers-browserify"),
        stream: require.resolve("stream-browserify"),
      },

      modules: [path.resolve(__dirname, paths.src.base), "node_modules"],
      extensions: ["*", ".js", ".jsx", ".ts", ".tsx"],
    },

    entry: entries,
    output: {
      clean: false,
      filename: (pathData, _assetInfo) => {
        if (!pathData.chunk) {
          throw new Error("pathData.chunk not defined for some reason");
        }

        const predefinedName = outputs[pathData.chunk.name || ""];
        if (predefinedName) return predefinedName;
        const filename = `${pathData.chunk.name || pathData.chunk.id}.js`;
        return path.join(paths.dist.chunks, filename);
      },
      path: path.resolve(__dirname, paths.dist.base),
      publicPath: "/",
      chunkFilename: `${paths.dist.chunks}/[id].js`,
      chunkFormat: "array-push",
      chunkLoadTimeout: 5000,
      chunkLoading: "jsonp",
      environment: {
        dynamicImport: true,
      },
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          resourceQuery: { not: [/raw/] },
          include: path.resolve(__dirname, paths.src.base),
          use: [
            {
              loader: "babel-loader",
              options: babelOptions,
            },
            {
              loader: "ts-loader",
            },
          ],
        },
        {
          test: /\.(js|jsx)$/,
          resourceQuery: { not: [/raw/] },
          include: path.resolve(__dirname, paths.src.base),
          exclude: /icons\/sets/,
          use: {
            loader: "babel-loader",
            options: babelOptions,
          },
        },
        {
          test: /\.s[ac]ss$/i,
          resourceQuery: { not: [/raw/] },
          use: [
            {
              loader: "style-loader",
            },
            {
              loader: "css-loader",
              options: {
                url: false,
              },
            },
            {
              loader: "sass-loader",
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: "style-loader",
            },
            {
              loader: "css-loader",
              options: {
                url: false,
              },
            },
          ],
        },
        {
          include: path.resolve(__dirname, paths.src.assets),
          loader: "file-loader",
          resourceQuery: { not: [/raw/] },
          options: {
            name: "[path][name].[ext]",
            context: paths.src.base,
          },
        },
        {
          resourceQuery: /raw/,
          type: "asset/source",
        },
      ],
    },

    plugins: [
      // new BundleAnalyzerPlugin(),

      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ["**/*"],
        cleanStaleWebpackAssets: false,
        protectWebpackAssets: false,
      }),
      new webpack.DefinePlugin({
        X_MODE: JSON.stringify(mode),
        X_BROWSER: JSON.stringify(targetBrowser),
      }),
      new WebExtensionChuckLoaderRuntimePlugin({
        backgroundWorkerEntry: targetBrowser === "chrome" ? "backgroundScript" : undefined,
      }),
      ...(targetBrowser === "chrome" ? [new ServiceWorkerEntryPlugin({}, "backgroundScript")] : []),
      ...generateFileInvocations,

      new GenerateFiles({
        file: paths.dist.manifest,
        content: JSON.stringify(generateManifest(mode, targetBrowser, paths), null, 4),
      }),
      // Part of files will be already copied by browser-runtime-geturl-loader, but not all (if you don't
      // import asset in code, it's not copied), so we need to do this with addiitonal plugin
      new CopyPlugin({
        patterns: [
          {
            from: `**`,
            context: paths.src.assets,
            to: ({ absoluteFilename }) => {
              const assetAbsolutePath = path.resolve(paths.src.assets);
              if (!absoluteFilename) {
                throw new Error("Expected absoluteFilename to contain a value");
              }
              return path.join(paths.dist.assets, absoluteFilename.replace(assetAbsolutePath, ""));
            },
          },
          {
            from: `**`,
            context: paths.src.locales,
            to: ({ absoluteFilename }) => {
              const assetAbsolutePath = path.resolve(paths.src.locales);
              if (!absoluteFilename) {
                throw new Error("Expected absoluteFilename to contain a value");
              }
              return path.join(paths.dist.locales, absoluteFilename.replace(assetAbsolutePath, ""));
            },
            // Only for Safari we rename extension to just 'Anori', to make it easier to deeplink extension settings from app
            transform:
              targetBrowser === "safari"
                ? (content, absoluteFrom) => {
                    if (absoluteFrom.endsWith("messages.json")) {
                      return content.toString().replace(/(?<="appName":\s?{\s*"message":\s?")[^"]+/i, "Anori");
                    }
                    return content;
                  }
                : undefined,
          },
        ],
        options: {
          once: true,
        },
      }),
      new MomentTimezoneDataPlugin({
        startYear: currentYear - 2,
        endYear: currentYear + 5,
      }),
      new MomentLocalesPlugin({
        localesToKeep: ["uk", "de", "fr", "es", "it", "th", "zh-cn", "ru", "ar", "pt-br"],
      }),
      ...zipPlugin,
    ],

    optimization: {
      minimizer:
        mode === "production"
          ? [
              new TerserPlugin({
                extractComments: false,
                terserOptions: {
                  compress: {},
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
            ]
          : [],

      splitChunks: {
        chunks: "all",
        automaticNameDelimiter: "-",
        minSize: 1024 * 50,
        maxSize: 1024 * 1024 * 3,
      },
    },
    performance: {
      maxEntrypointSize: 1024 * 1024 * 20,
      maxAssetSize: 1024 * 1024 * 50,
    },
  };

  return smp.wrap(config);
  // return config;
};

// biome-ignore lint/style/noDefaultExport: required by webpack
export default config;
