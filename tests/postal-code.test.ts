import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_DATA_BASE_URL,
  buildPostalCodeDataUrl,
  getPostalCodePrefix,
  normalizePostalCode,
  validatePostalCode
} from "../dist/index.js";

describe("normalizePostalCode", () => {
  it("keeps half-width digits", () => {
    assert.equal(normalizePostalCode("1000001"), "1000001");
  });

  it("removes half-width hyphens", () => {
    assert.equal(normalizePostalCode("100-0001"), "1000001");
  });

  it("converts full-width digits", () => {
    assert.equal(normalizePostalCode("１０００００１"), "1000001");
  });

  it("removes full-width hyphens", () => {
    assert.equal(normalizePostalCode("１００－０００１"), "1000001");
  });

  it("removes leading and trailing whitespace", () => {
    assert.equal(normalizePostalCode("  100-0001  "), "1000001");
  });

  it("removes mixed non-digit characters", () => {
    assert.equal(normalizePostalCode("〒100-0001 Chiyoda"), "1000001");
  });
});

describe("validatePostalCode", () => {
  it("returns true for valid postal codes", () => {
    assert.equal(validatePostalCode("100-0001"), true);
    assert.equal(validatePostalCode("１０００００１"), true);
  });

  it("returns false for invalid postal codes", () => {
    assert.equal(validatePostalCode("100"), false);
    assert.equal(validatePostalCode("abcdefg"), false);
    assert.equal(validatePostalCode("10000012"), false);
  });
});

describe("getPostalCodePrefix", () => {
  it("returns the first three digits for a valid postal code", () => {
    assert.equal(getPostalCodePrefix("100-0001"), "100");
  });

  it("returns null for an invalid postal code", () => {
    assert.equal(getPostalCodePrefix("abc"), null);
  });
});

describe("buildPostalCodeDataUrl", () => {
  it("builds a URL with the default base URL", () => {
    assert.equal(
      buildPostalCodeDataUrl("100-0001"),
      `${DEFAULT_DATA_BASE_URL}/100.json`
    );
  });

  it("builds a URL with a custom base URL", () => {
    assert.equal(
      buildPostalCodeDataUrl("100-0001", {
        baseUrl: "https://example.com/postal/v1"
      }),
      "https://example.com/postal/v1/100.json"
    );
  });

  it("ignores trailing slashes in the base URL", () => {
    assert.equal(
      buildPostalCodeDataUrl("100-0001", {
        baseUrl: "https://example.com/postal/v1/"
      }),
      "https://example.com/postal/v1/100.json"
    );
  });

  it("returns null for an invalid postal code", () => {
    assert.equal(buildPostalCodeDataUrl("abc"), null);
  });
});
