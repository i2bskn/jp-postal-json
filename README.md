# jp-postal-json

Japanese postal code utilities and a static JSON address lookup client.

Current version `0.2.0` provides postal code normalization, validation, prefix extraction, static data URL helpers, and a lookup client for hosted static JSON data.

日本の郵便番号を扱うための TypeScript first なユーティリティです。住所データ自体は npm package に同梱せず、デフォルトでは `https://data.jp-postal.com/v1` の静的 JSON を参照します。

## Installation

```sh
npm install jp-postal-json
```

## Usage

```ts
import {
  buildPostalCodeDataUrl,
  createPostalCodeClient,
  getPostalCodePrefix,
  lookupPostalCode,
  normalizePostalCode,
  validatePostalCode
} from "jp-postal-json";

normalizePostalCode("１００-０００１"); // "1000001"
validatePostalCode("100-0001"); // true
getPostalCodePrefix("100-0001"); // "100"
buildPostalCodeDataUrl("100-0001"); // "https://data.jp-postal.com/v1/100.json"

const client = createPostalCodeClient();
const addresses = await client.lookup("100-0001");

const addresses2 = await lookupPostalCode("100-0001");
```

## API

### `normalizePostalCode(input: string): string`

Normalizes Japanese postal code input into digits only.

- Converts full-width digits to half-width digits
- Removes half-width hyphens, full-width hyphens, whitespace, and other non-digit characters

### `validatePostalCode(input: string): boolean`

Returns `true` when the normalized input is exactly seven digits.

### `getPostalCodePrefix(input: string): string | null`

Returns the first three digits after normalization and validation. Returns `null` for invalid postal codes.

### `buildPostalCodeDataUrl(input: string, options?: { baseUrl?: string }): string | null`

Builds a static JSON data URL for the postal code prefix. This helper only builds a URL; it does not call `fetch`.

The default base URL is:

```ts
export const DEFAULT_DATA_BASE_URL = "https://data.jp-postal.com/v1";
```

### `createPostalCodeClient(options?: PostalCodeClientOptions): PostalCodeClient`

Creates a lookup client.

```ts
const client = createPostalCodeClient();
const addresses = await client.lookup("100-0001");
```

By default, the client fetches prefix JSON from `https://data.jp-postal.com/v1`.

```ts
const client = createPostalCodeClient({
  baseUrl: "https://example.com/postal/v1"
});
```

When a prefix JSON endpoint returns `404`, lookup returns an empty array instead of throwing.

```ts
await client.lookup("000-0000"); // []
await client.lookup("abc"); // []
```

Other HTTP errors, network errors, JSON parse errors, and invalid response structures throw.

The client uses `globalThis.fetch` by default. Pass `fetcher` to inject a custom fetch implementation for tests or custom runtimes.

```ts
const client = createPostalCodeClient({
  fetcher: customFetch
});
```

Prefix JSON responses are cached in memory by default. Pass `cache: false` to fetch every time, or call `clearCache()` to reset the cache.

```ts
const client = createPostalCodeClient();

await client.lookup("100-0001"); // fetches /100.json
await client.lookup("100-0005"); // reuses cached /100.json

client.clearCache();
```

### `lookupPostalCode(input: string, options?: LookupPostalCodeOptions): Promise<PostalAddress[]>`

Looks up addresses without creating a client explicitly.

```ts
const addresses = await lookupPostalCode("100-0001");
```

## Types

```ts
export type PostalAddress = {
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  prefectureKana?: string;
  cityKana?: string;
  townKana?: string;
};

export type PostalCodePrefixData = Record<string, PostalAddress[]>;

export type PostalCodeClient = {
  lookup(input: string, options?: PostalCodeLookupOptions): Promise<PostalAddress[]>;
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

export type LookupPostalCodeOptions = PostalCodeClientOptions & PostalCodeLookupOptions;
```

## Roadmap

- Cloudflare Pages demo
- Monthly data update workflow

## Data Source Note

Hosted address data is based on public postal code data from Japan Post.

This package does not bundle postal address data.

## Disclaimer / No SLA

This package is provided as-is, without any SLA.

No warranty is made for accuracy, availability, continued operation, or fitness for a particular purpose. Hosted JSON data should be mirrored or cached by users for production use.

For production systems, avoid depending solely on the hosted endpoint. Mirror or cache the JSON data when availability, latency, or data retention matters.

## License

MIT
