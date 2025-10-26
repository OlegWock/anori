import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin";
import { defineConfig } from "@rspack/cli";
// @ts-expect-error Incompatible declarations
import FileManagerPlugin from "filemanager-webpack-plugin";
// @ts-expect-error No declarations for this module!
import GenerateFiles from "generate-file-webpack-plugin";
// @ts-expect-error No declarations for this module!
import MomentLocalesPlugin from "moment-locales-webpack-plugin";
import MomentTimezoneDataPlugin from "moment-timezone-data-webpack-plugin";
import { TsCheckerRspackPlugin } from "ts-checker-rspack-plugin";
import Icons from "unplugin-icons/rspack";
import WebExtension from "webpack-target-webextension";
import packageJson from "./package.json" with { type: "json" };

const require = createRequire(import.meta.url);

import type { RspackOptions } from "@rspack/core";
import { CopyRspackPlugin, DefinePlugin, ProgressPlugin } from "@rspack/core";
import { generateManifest } from "./build_helpers/manifest.ts";
import {
  constructEntriesAndOutputs,
  constructGenerateFileInvocations,
  createPathsObject,
  joinPath,
} from "./build_helpers/utils.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseSrc = "./src";
const baseDist = "./dist";

// biome-ignore lint/style/noDefaultExport: Required by Rspack
export default defineConfig(async (env, argv): Promise<RspackOptions> => {
  const { mode = "development" } = argv;
  const { targetBrowser = "chrome" } = env;
  const currentYear = new Date().getFullYear();

  const paths = createPathsObject(baseSrc, joinPath(baseDist, targetBrowser));
  const { entries, outputs } = constructEntriesAndOutputs(paths, mode);

  const pageTemplate = fs.readFileSync(paths.src.pageHtmlTemplate, {
    encoding: "utf-8",
  });

  const manifest = generateManifest(mode, targetBrowser, paths);

  const sharedSwcEnvConfiguration = {
    targets: {
      chrome: "110",
      firefox: "110",
    },
  };
  const sharedSwcTransformConfiguration = {
    react: {
      runtime: "automatic",
      development: mode === "development",
    },
  };

  return {
    mode,
    devtool: false,
    entry: entries,
    experiments: {
      incremental: "safe",
    },
    performance: {
      maxAssetSize: 1024 * 1024 * 20,
      maxEntrypointSize: 1024 * 1024 * 20,
    },
    watchOptions: {
      // Ignore everything not in /src
      ignored: /^(?!.*[\\/]src[\\/]).*$/,
    },
    output: {
      clean: true,
      filename: (pathData) => {
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
      environment: {
        dynamicImport: true,
      },
    },
    resolve: {
      alias: {
        "@anori/utils": path.resolve(__dirname, paths.src.utils),
        "@anori/components": path.resolve(__dirname, paths.src.components),
        "@anori/assets": path.resolve(__dirname, paths.src.assets),
        "@anori/plugins": path.resolve(__dirname, paths.src.plugins),
        "@anori/translations": path.resolve(__dirname, paths.src.translations),
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

      // modules: [path.resolve(__dirname, paths.src.base), "node_modules"],
      extensions: ["*", ".js", ".jsx", ".ts", ".tsx"],
    },
    module: {
      defaultRules: [
        "...", // Add rules applied by webpack by default
      ],
      rules: [
        // Typescript TSX
        {
          test: /\.(ts|tsx)$/,
          include: path.resolve(__dirname, paths.src.base),
          loader: "builtin:swc-loader",
          options: {
            env: sharedSwcEnvConfiguration,
            jsc: {
              parser: {
                syntax: "typescript",
              },
              transform: sharedSwcTransformConfiguration,
            },
          },
          type: "javascript/auto",
        },
        // JSX
        {
          test: /\.(js|jsx)$/,
          use: {
            loader: "builtin:swc-loader",
            options: {
              env: sharedSwcEnvConfiguration,
              jsc: {
                parser: {
                  syntax: "ecmascript",
                  jsx: true,
                },
                transform: sharedSwcTransformConfiguration,
              },
            },
          },
          type: "javascript/auto",
        },
        // Styles
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
        // Assets
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
      new TsCheckerRspackPlugin({ typescript: { mode: "write-references" } }),
      new ProgressPlugin(),
      new DefinePlugin({
        X_MODE: JSON.stringify(mode),
        X_BROWSER: JSON.stringify(targetBrowser),
      }),
      new CopyRspackPlugin({
        patterns: [
          {
            from: paths.src.assets,
            to: paths.dist.assets,
          },
          {
            from: paths.src.locales,
            to: paths.dist.locales,
          },
        ],
      }),
      ...constructGenerateFileInvocations(paths, pageTemplate),
      new GenerateFiles({
        file: paths.dist.manifest,
        content: JSON.stringify(manifest, null, 4),
      }),
      new WebExtension({
        background:
          targetBrowser === "firefox" ? { pageEntry: "backgroundScript" } : { serviceWorkerEntry: "backgroundScript" },
        experimental_output: {
          ...Object.fromEntries(Object.keys(entries).map((key) => [key, false])),
          backgroundScript: paths.dist.backgroundWrapper,
        },
      }),
      new MomentTimezoneDataPlugin({
        startYear: currentYear - 2,
        endYear: currentYear + 5,
      }),
      new MomentLocalesPlugin({
        localesToKeep: ["uk", "de", "fr", "es", "it", "th", "zh-cn", "ru", "ar", "pt-br"],
      }),
      Icons({ compiler: "jsx", jsx: "react" }),
      mode === "production" &&
        new FileManagerPlugin({
          events: {
            onEnd: {
              archive: [
                {
                  source: paths.dist.base,
                  destination: `${baseDist}/${packageJson.name}-${targetBrowser}-${mode}-v${packageJson.version}.zip`,
                },
              ],
            },
          },
        }),
      process.env.RSDOCTOR &&
        new RsdoctorRspackPlugin({
          supports: {
            generateTileGraph: true,
          },
        }),
    ].filter(Boolean),
  };
});
