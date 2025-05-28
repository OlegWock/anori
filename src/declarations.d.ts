// TODO: replace biome-ignore lint/style/noDefaultExport in this file with single file-level ignore once
// we update to biome 2

declare module "@anori/assets/*" {
  const url: string;
  // biome-ignore lint/style/noDefaultExport: we prefer asset imports to have default export
  export default url;
}

declare module "*?raw" {
  const content: string;
  // biome-ignore lint/style/noDefaultExport: we prefer asset imports to have default export
  export default content;
}

declare module "*.scss" {
  const content: string;
  // biome-ignore lint/style/noDefaultExport: we prefer asset imports to have default export
  export default content;
}

declare module "*.sass" {
  const content: string;
  // biome-ignore lint/style/noDefaultExport: we prefer asset imports to have default export
  export default content;
}

declare module "*.css" {
  const content: string;
  // biome-ignore lint/style/noDefaultExport: we prefer asset imports to have default export
  export default content;
}

declare const X_MODE: "development" | "production";
declare const X_BROWSER: "chrome" | "firefox";
