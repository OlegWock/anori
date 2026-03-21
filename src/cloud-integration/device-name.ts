function getBrowser(): string {
  if (typeof navigator === "undefined") return "Unknown browser";

  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  if (uaData?.brands) {
    const dominated = new Set(["Chromium", "Not A(Brand", "Not;A=Brand", "Not_A Brand", "Google Chrome"]);
    const brand = uaData.brands.find((b) => !dominated.has(b.brand));
    if (brand) return brand.brand;
    if (uaData.brands.some((b) => b.brand === "Google Chrome")) return "Chrome";
    return "Chromium";
  }

  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "Unknown browser";
}

function getOS(): string {
  if (typeof navigator === "undefined") return "Unknown OS";

  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  if (uaData?.platform) {
    const platform = uaData.platform;
    if (platform === "Windows") return "Windows";
    if (platform === "macOS") return "macOS";
    if (platform === "Linux") return "Linux";
    if (platform === "Android") return "Android";
    if (platform === "iOS") return "iOS";
    return platform;
  }

  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown OS";
}

export function getDeviceName(): string {
  return `${getBrowser()} on ${getOS()}`;
}

interface NavigatorUABrandVersion {
  brand: string;
  version: string;
}

interface NavigatorUAData {
  brands: NavigatorUABrandVersion[];
  mobile: boolean;
  platform: string;
}
