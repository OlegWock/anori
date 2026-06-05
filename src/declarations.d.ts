// biome-ignore-all lint/style/noDefaultExport: we prefer asset imports to have default export

declare module "@anori/assets/*" {
  const url: string;
  export default url;
}

declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "*.scss" {
  const content: string;
  export default content;
}

declare module "*.sass" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "~icons/*?raw" {
  const content: string;
  export default content;
}

declare const X_MODE: "development" | "production";
declare const X_BROWSER: "chrome" | "firefox";
