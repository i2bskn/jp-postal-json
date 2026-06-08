const DATA_BASE_URL = "https://data.jp-postal.com/v1";

const form = document.querySelector("[data-demo-form]");
const input = document.querySelector("[data-demo-input]");
const result = document.querySelector("[data-demo-result]");
const statusMessage = document.querySelector("[data-demo-status]");
const exampleButton = document.querySelector("[data-demo-example]");

function normalizePostalCode(value) {
  return value
    .replace(/[０-９]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - "０".charCodeAt(0) + "0".charCodeAt(0))
    )
    .replace(/\D/g, "");
}

function formatPostalCode(value) {
  return `${value.slice(0, 3)}-${value.slice(3)}`;
}

function setStatus(message, kind = "neutral") {
  statusMessage.textContent = message;
  statusMessage.dataset.kind = kind;
}

function clearResult() {
  result.replaceChildren();
  result.hidden = true;
}

function renderAddresses(addresses) {
  result.replaceChildren();

  for (const address of addresses) {
    const item = document.createElement("article");
    item.className = "result-item";

    const title = document.createElement("h3");
    title.textContent = `${formatPostalCode(address.postalCode)} ${address.prefecture}${address.city}${address.town}`;

    const kana = document.createElement("p");
    kana.textContent = [address.prefectureKana, address.cityKana, address.townKana]
      .filter(Boolean)
      .join(" ");

    item.append(title, kana);
    result.append(item);
  }

  result.hidden = false;
}

async function lookupPostalCode(rawValue) {
  const postalCode = normalizePostalCode(rawValue);

  if (!/^\d{7}$/.test(postalCode)) {
    return {
      kind: "invalid",
      addresses: []
    };
  }

  const prefix = postalCode.slice(0, 3);
  const response = await fetch(`${DATA_BASE_URL}/${prefix}.json`);

  if (response.status === 404) {
    return {
      kind: "not-found",
      addresses: []
    };
  }

  if (!response.ok) {
    throw new Error(`Unexpected status: ${response.status}`);
  }

  const data = await response.json();
  const addresses = Array.isArray(data[postalCode]) ? data[postalCode] : [];

  return {
    kind: addresses.length > 0 ? "found" : "not-found",
    addresses
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearResult();
  setStatus("検索しています...", "neutral");

  try {
    const lookupResult = await lookupPostalCode(input.value);

    if (lookupResult.kind === "invalid") {
      setStatus("7桁の郵便番号を入力してください。", "error");
      return;
    }

    if (lookupResult.addresses.length === 0) {
      setStatus("住所候補が見つかりません。", "empty");
      return;
    }

    renderAddresses(lookupResult.addresses);
    setStatus(`${lookupResult.addresses.length}件の住所候補が見つかりました。`, "success");
  } catch (_error) {
    setStatus("取得に失敗しました。時間をおいて再度お試しください。", "error");
  }
});

exampleButton.addEventListener("click", () => {
  input.value = "100-0001";
  input.focus();
});
