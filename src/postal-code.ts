export const DEFAULT_DATA_BASE_URL = "https://data.jp-postal.com/v1";

const FULL_WIDTH_ZERO_CODE_POINT = "０".charCodeAt(0);
const ASCII_ZERO_CODE_POINT = "0".charCodeAt(0);

export function normalizePostalCode(input: string): string {
  return input
    .replace(/[０-９]/g, (digit) =>
      String.fromCharCode(
        digit.charCodeAt(0) - FULL_WIDTH_ZERO_CODE_POINT + ASCII_ZERO_CODE_POINT
      )
    )
    .replace(/\D/g, "");
}

export function validatePostalCode(input: string): boolean {
  return /^\d{7}$/.test(normalizePostalCode(input));
}

export function getPostalCodePrefix(input: string): string | null {
  const normalized = normalizePostalCode(input);

  if (!/^\d{7}$/.test(normalized)) {
    return null;
  }

  return normalized.slice(0, 3);
}

export function buildPostalCodeDataUrl(
  input: string,
  options: { baseUrl?: string } = {}
): string | null {
  const prefix = getPostalCodePrefix(input);

  if (prefix === null) {
    return null;
  }

  const baseUrl = (options.baseUrl ?? DEFAULT_DATA_BASE_URL).replace(/\/+$/, "");

  return `${baseUrl}/${prefix}.json`;
}
