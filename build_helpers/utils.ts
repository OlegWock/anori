import * as path from "node:path";
import type { Mode } from "@rspack/core";
// @ts-expect-error No declarations for this module!
import GenerateFiles from "generate-file-webpack-plugin";
import walkSync from "walk-sync";

export const scriptExtensions = [".tsx", ".jsx", ".ts", ".js"];

export const isScript = (filename: string) => scriptExtensions.some((ext) => filename.endsWith(ext));

export const scriptName = (filename: string) =>
  scriptExtensions.reduce((name, extension) => name.replace(extension, ""), filename);

export const joinPath = (...args: string[]) => {
  // preserve dot on start of path
  const hasDot = args.length && args[0].startsWith("./");
  const res = path.join(...args);
  if (hasDot) return `./${res}`;
  return res;
};

export const createPathsObject = (baseSrc: string, baseDist: string) => {
  return {
    src: {
      base: baseSrc,
      background: joinPath(baseSrc, "background.ts"),
      contentscripts: joinPath(baseSrc, "contentscripts"),
      scripts: joinPath(baseSrc, "scripts"),
      pages: joinPath(baseSrc, "pages"),
      pageHtmlTemplate: "./build_helpers/page_template.html",

      utils: joinPath(baseSrc, "utils"),
      components: joinPath(baseSrc, "components"),
      assets: joinPath(baseSrc, "assets"),
      locales: joinPath(baseSrc, "_locales"),
      plugins: joinPath(baseSrc, "plugins"),
      translations: joinPath(baseSrc, "translations"),
    },
    dist: {
      base: baseDist,
      background: "background.js",
      backgroundWrapper: "background-wrapper.js",
      contentscripts: "contentscripts",
      scripts: "scripts",
      pages: "pages",
      assets: "assets",
      locales: "_locales",
      chunks: "chunks",

      manifest: "manifest.json",
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

export interface EntriesAndOutputs {
  entries: Record<string, string[]>;
  outputs: Record<string, string>;
}

export function constructEntriesAndOutputs(paths: ReturnType<typeof createPathsObject>, mode: Mode): EntriesAndOutputs {
  const entries: EntriesAndOutputs["entries"] = {
    backgroundScript: [paths.src.background],
  };
  const outputs: EntriesAndOutputs["outputs"] = {
    backgroundScript: paths.dist.background,
  };

  const pages = walkSync(paths.src.pages, {
    globs: scriptExtensions.map((ext) => `*/*${ext}`),
    ignore: [
      ...scriptExtensions.map((ext) => `**/components/**/*${ext}`),
      ...(mode !== "development" ? scriptExtensions.map((ext) => `*/*-debug${ext}`) : []),
    ],
    directories: false,
  });

  pages.forEach((page) => {
    const cleanName = scriptName(page);
    entries[cleanName] = [joinPath(paths.src.pages, page)];
    outputs[cleanName] = joinPath(paths.dist.pages, `${cleanName}.js`);
  });

  const contentscripts = walkSync(paths.src.contentscripts, {
    globs: scriptExtensions.map((ext) => `**/*${ext}`),
    ignore: mode !== "development" ? scriptExtensions.map((ext) => `**/*-debug${ext}`) : [],
    directories: false,
  });

  contentscripts.forEach((cs) => {
    const cleanName = scriptName(cs);
    entries[cleanName] = [joinPath(paths.src.contentscripts, cs)];
    outputs[cleanName] = joinPath(paths.dist.contentscripts, `${cleanName}.js`);
  });

  const scripts = walkSync(paths.src.scripts, {
    globs: scriptExtensions.map((ext) => `**/*${ext}`),
    directories: false,
  });

  scripts.forEach((cs) => {
    const cleanName = scriptName(cs);
    entries[cleanName] = [joinPath(paths.src.scripts, cs)];
    outputs[cleanName] = joinPath(paths.dist.scripts, `${cleanName}.js`);
  });

  return { entries, outputs };
}

export function constructGenerateFileInvocations(
  paths: ReturnType<typeof createPathsObject>,
  pageTemplate: string,
): GenerateFiles[] {
  const generateFileInvocations: GenerateFiles[] = [];

  const pages = walkSync(paths.src.pages, {
    globs: scriptExtensions.map((ext) => `*/*${ext}`),
    ignore: scriptExtensions.map((ext) => `**/components/**/*${ext}`),
    directories: false,
  });

  pages.forEach((page) => {
    const cleanName = scriptName(page);
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

  return generateFileInvocations;
}
