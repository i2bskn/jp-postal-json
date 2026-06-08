export {
  createPostalCodeClient,
  lookupPostalCode
} from "./client.js";
export type {
  LookupPostalCodeOptions,
  PostalCodeClient,
  PostalCodeClientOptions,
  PostalCodeLookupOptions
} from "./client.js";
export {
  DEFAULT_DATA_BASE_URL,
  buildPostalCodeDataUrl,
  getPostalCodePrefix,
  normalizePostalCode,
  validatePostalCode
} from "./postal-code.js";
export type { PostalAddress, PostalCodePrefixData } from "./types.js";
