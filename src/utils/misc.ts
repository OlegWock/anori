export const guid = () => {
  // guid()
  // => "563befe9-405e-0e52-6779-9fad2f181678"
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
};

export const parseHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch (_err) {
    return `Couldn't parse hostname`;
  }
};

export const normalizeUrl = (url: string) => {
  if (!url.includes("://") && !url.startsWith("#")) {
    return `https://${url}`;
  }

  return url;
};

export const asyncIterableToArray = async <T>(iter: AsyncIterable<T>): Promise<T[]> => {
  const res: T[] = [];
  for await (const val of iter) {
    res.push(val);
  }
  return res;
};

export const choose = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export const minmax = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
};

export const cachedFunc = <T>(func: () => T) => {
  const called = false;
  let val: T | undefined = undefined;

  return () => {
    if (!called) {
      val = func();
    }
    return val as T;
  };
};

const namedCallOnceCache: Map<string, ReturnType<typeof cachedFunc<any>>> = new Map();
export const globalCallOnce = <T>(name: string, func: () => T) => {
  const fromCache = namedCallOnceCache.get(name);
  if (fromCache) return fromCache;
  const intance = cachedFunc(func);
  namedCallOnceCache.set(name, intance);
  return intance;
};

export const iife = <T>(func: () => T): T => func();
