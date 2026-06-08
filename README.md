# jp-postal-json

Japanese postal code utilities and a future static JSON address lookup client.

Current version `0.1.0` provides postal code normalization, validation, prefix extraction, and static data URL helpers. It does not bundle postal address data yet and does not perform network requests.

日本の郵便番号を扱うための TypeScript first なユーティリティです。現時点では住所検索や住所データ配信は含みません。

## Installation

```sh
npm install jp-postal-json
```

## Usage

```ts
import {
  buildPostalCodeDataUrl,
  getPostalCodePrefix,
  normalizePostalCode,
  validatePostalCode
} from "jp-postal-json";

normalizePostalCode("１００-０００１"); // "1000001"
validatePostalCode("100-0001"); // true
getPostalCodePrefix("100-0001"); // "100"
buildPostalCodeDataUrl("100-0001"); // "https://data.jp-postal.com/v1/100.json"
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

Builds a future static JSON data URL for the postal code prefix. This helper only builds a URL; it does not call `fetch`.

The default base URL is:

```ts
export const DEFAULT_DATA_BASE_URL = "https://data.jp-postal.com/v1";
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
```

## Roadmap

- Static JSON dataset
- `data.jp-postal.com`
- Lookup client
- Cloudflare Pages demo
- Monthly data update workflow

## Data Source Note

Future address data is planned to be based on public postal code data from Japan Post.

This package currently does not bundle postal address data.

## Disclaimer / No SLA

This package is provided as-is, without any SLA.

No warranty is made for accuracy, availability, continued operation, or fitness for a particular purpose. Future hosted JSON data should be mirrored or cached by users for production use.

## License

MIT
