// Only HTTP(S) pages can be stashed; this filters service pages, extension pages, and non-navigational schemes.
export function isCapturableUrl(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}
