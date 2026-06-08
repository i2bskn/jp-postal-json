import {
  DEFAULT_DATA_BASE_URL,
  buildPostalCodeDataUrl,
  getPostalCodePrefix,
  normalizePostalCode
} from "./postal-code.js";
import type { PostalAddress, PostalCodePrefixData } from "./types.js";

export type PostalCodeClient = {
  lookup(
    input: string,
    options?: PostalCodeLookupOptions
  ): Promise<PostalAddress[]>;
  clearCache(): void;
};

export type PostalCodeClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  cache?: boolean;
};

export type PostalCodeLookupOptions = {
  signal?: AbortSignal;
};

export type LookupPostalCodeOptions = PostalCodeClientOptions &
  PostalCodeLookupOptions;

export function createPostalCodeClient(
  options: PostalCodeClientOptions = {}
): PostalCodeClient {
  const baseUrl = options.baseUrl ?? DEFAULT_DATA_BASE_URL;
  const cacheEnabled = options.cache ?? true;
  const fetcher = resolveFetcher(options.fetcher);
  const cache = new Map<string, Promise<PostalCodePrefixData | null>>();

  async function loadPrefixData(
    normalizedPostalCode: string,
    lookupOptions: PostalCodeLookupOptions = {}
  ): Promise<PostalCodePrefixData | null> {
    const prefix = getPostalCodePrefix(normalizedPostalCode);

    if (prefix === null) {
      return null;
    }

    if (!cacheEnabled) {
      return fetchPrefixData(normalizedPostalCode, baseUrl, fetcher, lookupOptions);
    }

    const cached = cache.get(prefix);

    if (cached !== undefined) {
      return cached;
    }

    const request = fetchPrefixData(
      normalizedPostalCode,
      baseUrl,
      fetcher,
      lookupOptions
    ).catch((error: unknown) => {
      cache.delete(prefix);
      throw error;
    });
    cache.set(prefix, request);

    return request;
  }

  return {
    async lookup(input: string, lookupOptions: PostalCodeLookupOptions = {}) {
      const normalized = normalizePostalCode(input);

      if (getPostalCodePrefix(normalized) === null) {
        return [];
      }

      const data = await loadPrefixData(normalized, lookupOptions);
      const addresses = data?.[normalized];

      return addresses === undefined ? [] : [...addresses];
    },

    clearCache() {
      cache.clear();
    }
  };
}

export function lookupPostalCode(
  input: string,
  options: LookupPostalCodeOptions = {}
): Promise<PostalAddress[]> {
  const { signal, ...clientOptions } = options;
  const client = createPostalCodeClient(clientOptions);

  return client.lookup(input, signal === undefined ? undefined : { signal });
}

function resolveFetcher(fetcher?: typeof fetch): typeof fetch {
  if (fetcher !== undefined) {
    return fetcher;
  }

  if (typeof globalThis.fetch !== "function") {
    throw new Error(
      "globalThis.fetch is not available. Pass a fetcher option to createPostalCodeClient()."
    );
  }

  return globalThis.fetch.bind(globalThis);
}

async function fetchPrefixData(
  normalizedPostalCode: string,
  baseUrl: string,
  fetcher: typeof fetch,
  options: PostalCodeLookupOptions
): Promise<PostalCodePrefixData | null> {
  const url = buildPostalCodeDataUrl(normalizedPostalCode, { baseUrl });

  if (url === null) {
    return null;
  }

  const init: RequestInit =
    options.signal === undefined ? {} : { signal: options.signal };
  const response = await fetcher(url, init);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch postal code data: ${response.status} ${response.statusText}`
    );
  }

  const data: unknown = await response.json();

  return parsePostalCodePrefixData(data);
}

function parsePostalCodePrefixData(data: unknown): PostalCodePrefixData {
  if (!isRecord(data)) {
    throw new Error("Invalid postal code prefix data response.");
  }

  const result: PostalCodePrefixData = {};

  for (const [postalCode, addresses] of Object.entries(data)) {
    if (!Array.isArray(addresses)) {
      throw new Error("Invalid postal code prefix data response.");
    }

    for (const address of addresses) {
      if (!isPostalAddress(address)) {
        throw new Error("Invalid postal code prefix data response.");
      }
    }

    result[postalCode] = addresses;
  }

  return result;
}

function isPostalAddress(value: unknown): value is PostalAddress {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["postalCode"] === "string" &&
    typeof value["prefecture"] === "string" &&
    typeof value["city"] === "string" &&
    typeof value["town"] === "string" &&
    isOptionalString(value["prefectureKana"]) &&
    isOptionalString(value["cityKana"]) &&
    isOptionalString(value["townKana"])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}
