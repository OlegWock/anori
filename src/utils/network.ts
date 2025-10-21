export const loadTextAsset = async (url: string): Promise<string> => {
  const response = await fetch(url);
  return response.text();
};

type IpInfoApiResponse = {
  ip: string;
  hostname: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
  readme: string;
};

export type IpInfo = IpInfoApiResponse & {
  lat: number | undefined;
  long: number | undefined;
};

export const getIpInfo = async (): Promise<IpInfo> => {
  const resp = await fetch("https://ipinfo.io/json");
  const json = (await resp.json()) as IpInfoApiResponse;

  const [lat, long] = json.loc.includes(",")
    ? json.loc.split(",").map((i: string) => Number.parseInt(i))
    : [undefined, undefined];
  return {
    ...json,
    lat,
    long,
  };
};
