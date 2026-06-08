import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_DATA_BASE_URL,
  createPostalCodeClient,
  lookupPostalCode,
  type PostalAddress,
  type PostalCodePrefixData
} from "../dist/index.js";

const imperialPalaceAddress: PostalAddress = {
  postalCode: "1000001",
  prefecture: "東京都",
  city: "千代田区",
  town: "千代田",
  prefectureKana: "トウキョウト",
  cityKana: "チヨダク",
  townKana: "チヨダ"
};

const marunouchiAddress: PostalAddress = {
  postalCode: "1000005",
  prefecture: "東京都",
  city: "千代田区",
  town: "丸の内"
};

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json"
    },
    ...init
  });
}

function prefixData(): PostalCodePrefixData {
  return {
    "1000001": [imperialPalaceAddress],
    "1000005": [marunouchiAddress]
  };
}

describe("createPostalCodeClient", () => {
  it("returns matching addresses for a valid postal code", async () => {
    const fetcher: typeof fetch = async () => jsonResponse(prefixData());
    const client = createPostalCodeClient({ fetcher });

    assert.deepEqual(await client.lookup("1000001"), [imperialPalaceAddress]);
  });

  it("normalizes hyphenated input before lookup", async () => {
    const calls: Array<Parameters<typeof fetch>[0]> = [];
    const fetcher: typeof fetch = async (input) => {
      calls.push(input);
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({ fetcher });

    assert.deepEqual(await client.lookup("100-0001"), [imperialPalaceAddress]);
    assert.deepEqual(calls, [`${DEFAULT_DATA_BASE_URL}/100.json`]);
  });

  it("returns an empty array for an invalid postal code", async () => {
    let fetchCount = 0;
    const fetcher: typeof fetch = async () => {
      fetchCount += 1;
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({ fetcher });

    assert.deepEqual(await client.lookup("abc"), []);
    assert.equal(fetchCount, 0);
  });

  it("returns an empty array when prefix JSON returns 404", async () => {
    const fetcher: typeof fetch = async () =>
      new Response("Not Found", {
        status: 404,
        statusText: "Not Found"
      });
    const client = createPostalCodeClient({ fetcher });

    assert.deepEqual(await client.lookup("000-0000"), []);
  });

  it("returns an empty array when the postal code is missing in prefix JSON", async () => {
    const fetcher: typeof fetch = async () => jsonResponse(prefixData());
    const client = createPostalCodeClient({ fetcher });

    assert.deepEqual(await client.lookup("100-9999"), []);
  });

  it("throws for non-404 HTTP errors", async () => {
    const fetcher: typeof fetch = async () =>
      new Response("Server Error", {
        status: 500,
        statusText: "Internal Server Error"
      });
    const client = createPostalCodeClient({ fetcher });

    await assert.rejects(
      () => client.lookup("100-0001"),
      /Failed to fetch postal code data: 500 Internal Server Error/
    );
  });

  it("throws when fetch rejects", async () => {
    const fetcher: typeof fetch = async () => {
      throw new Error("network failure");
    };
    const client = createPostalCodeClient({ fetcher });

    await assert.rejects(() => client.lookup("100-0001"), /network failure/);
  });

  it("throws when JSON parsing fails", async () => {
    const fetcher: typeof fetch = async () =>
      new Response("{", {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });
    const client = createPostalCodeClient({ fetcher });

    await assert.rejects(() => client.lookup("100-0001"));
  });

  it("throws when the response structure is invalid", async () => {
    const fetcher: typeof fetch = async () =>
      jsonResponse({
        "1000001": {
          postalCode: "1000001"
        }
      });
    const client = createPostalCodeClient({ fetcher });

    await assert.rejects(
      () => client.lookup("100-0001"),
      /Invalid postal code prefix data response/
    );
  });

  it("fetches the same prefix only once when cache is true", async () => {
    let fetchCount = 0;
    const fetcher: typeof fetch = async () => {
      fetchCount += 1;
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({ fetcher });

    assert.deepEqual(await client.lookup("100-0001"), [imperialPalaceAddress]);
    assert.deepEqual(await client.lookup("100-0005"), [marunouchiAddress]);
    assert.equal(fetchCount, 1);
  });

  it("fetches every time when cache is false", async () => {
    let fetchCount = 0;
    const fetcher: typeof fetch = async () => {
      fetchCount += 1;
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({ fetcher, cache: false });

    await client.lookup("100-0001");
    await client.lookup("100-0005");

    assert.equal(fetchCount, 2);
  });

  it("refetches after clearCache", async () => {
    let fetchCount = 0;
    const fetcher: typeof fetch = async () => {
      fetchCount += 1;
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({ fetcher });

    await client.lookup("100-0001");
    client.clearCache();
    await client.lookup("100-0005");

    assert.equal(fetchCount, 2);
  });

  it("uses a custom baseUrl", async () => {
    const calls: Array<Parameters<typeof fetch>[0]> = [];
    const fetcher: typeof fetch = async (input) => {
      calls.push(input);
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({
      baseUrl: "https://example.com/postal/v1/",
      fetcher
    });

    await client.lookup("100-0001");

    assert.deepEqual(calls, ["https://example.com/postal/v1/100.json"]);
  });

  it("uses a custom fetcher", async () => {
    let customFetcherCalled = false;
    const fetcher: typeof fetch = async () => {
      customFetcherCalled = true;
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({ fetcher });

    await client.lookup("100-0001");

    assert.equal(customFetcherCalled, true);
  });

  it("passes AbortSignal to fetch", async () => {
    const controller = new AbortController();
    const seenSignals: Array<RequestInit["signal"]> = [];
    const fetcher: typeof fetch = async (_input, init) => {
      seenSignals.push(init?.signal);
      return jsonResponse(prefixData());
    };
    const client = createPostalCodeClient({ fetcher });

    await client.lookup("100-0001", { signal: controller.signal });

    assert.deepEqual(seenSignals, [controller.signal]);
  });
});

describe("lookupPostalCode", () => {
  it("looks up addresses without creating a client explicitly", async () => {
    const fetcher: typeof fetch = async () => jsonResponse(prefixData());

    assert.deepEqual(await lookupPostalCode("100-0001", { fetcher }), [
      imperialPalaceAddress
    ]);
  });
});
