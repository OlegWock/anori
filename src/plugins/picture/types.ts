export type PicturePluginWidgetConfig = {
  // "url" renders `url`; "local" renders the OPFS file identified by `imageId`.
  // Absent means "url" (older widgets predate this field).
  source?: "url" | "local";
  url: string;
  imageId?: string;
};
