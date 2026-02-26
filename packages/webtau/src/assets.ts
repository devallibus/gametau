/**
 * webtau/assets — Asset loading foundation module for web builds.
 *
 * Includes caching helpers for text/json/binary/image payloads with
 * optional fetch/image injection points for tests.
 */

export interface AssetLoader {
  clear(): void;
  loadText(url: string, init?: RequestInit): Promise<string>;
  loadJson<T>(url: string, init?: RequestInit): Promise<T>;
  loadBytes(url: string, init?: RequestInit): Promise<ArrayBuffer>;
  loadImage(url: string): Promise<HTMLImageElement>;
}

export interface AssetLoaderOptions {
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  imageFactory?: () => HTMLImageElement;
}

function defaultFetch(input: string, init?: RequestInit): Promise<Response> {
  if (typeof fetch !== "function") {
    throw new Error("[webtau/assets] Fetch API is not available.");
  }
  return fetch(input, init);
}

function createDefaultImage(): HTMLImageElement {
  const ImageCtor = (globalThis as { Image?: { new (): HTMLImageElement } }).Image;
  if (!ImageCtor) {
    throw new Error("[webtau/assets] Image constructor is not available.");
  }
  return new ImageCtor();
}

export function createAssetLoader(options: AssetLoaderOptions = {}): AssetLoader {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const imageFactory = options.imageFactory ?? createDefaultImage;

  const cache = new Map<string, Promise<unknown>>();

  async function fetchOrThrow(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetchImpl(url, init);
    if (!response.ok) {
      throw new Error(`[webtau/assets] Failed to load "${url}" (HTTP ${response.status}).`);
    }
    return response;
  }

  function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (!cache.has(key)) {
      cache.set(key, loader());
    }
    return cache.get(key) as Promise<T>;
  }

  const clear = (): void => {
    cache.clear();
  };

  const loadText = (url: string, init?: RequestInit): Promise<string> => {
    return cached(`text:${url}`, async () => {
      const response = await fetchOrThrow(url, init);
      return response.text();
    });
  };

  const loadJson = <T>(url: string, init?: RequestInit): Promise<T> => {
    return cached(`json:${url}`, async () => {
      const text = await loadText(url, init);
      return JSON.parse(text) as T;
    });
  };

  const loadBytes = (url: string, init?: RequestInit): Promise<ArrayBuffer> => {
    return cached(`bytes:${url}`, async () => {
      const response = await fetchOrThrow(url, init);
      return response.arrayBuffer();
    });
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return cached(`image:${url}`, async () => {
      const image = imageFactory();
      return new Promise((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`[webtau/assets] Failed to load image "${url}".`));
        image.src = url;
      });
    });
  };

  return {
    clear,
    loadText,
    loadJson,
    loadBytes,
    loadImage,
  };
}
