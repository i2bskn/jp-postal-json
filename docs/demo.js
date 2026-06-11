const DATA_BASE_URL = "https://data.jp-postal.com/v1";

/* ---------- Theme toggle ---------- */

const themeToggle = document.querySelector("[data-theme-toggle]");

themeToggle?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("jp-postal-theme", next);
});

/* ---------- Syntax highlight ---------- */

const TS_PATTERNS = [
  { type: "cm", regex: /\/\/[^\n]*/y },
  { type: "str", regex: /"(?:[^"\\\n]|\\.)*"/y },
  {
    type: "kw",
    regex:
      /\b(?:import|from|export|const|let|type|await|async|return|new|typeof|true|false|null|undefined)\b/y
  },
  { type: "fn", regex: /\b[A-Za-z_$][\w$]*(?=\s*\()/y },
  { type: "num", regex: /\b\d[\d_]*\b/y }
];

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightSource(source, patterns) {
  let html = "";
  let index = 0;

  while (index < source.length) {
    let matched = false;

    for (const { type, regex } of patterns) {
      regex.lastIndex = index;
      const match = regex.exec(source);

      if (match) {
        html += `<span class="tok-${type}">${escapeHtml(match[0])}</span>`;
        index = regex.lastIndex;
        matched = true;
        break;
      }
    }

    if (!matched) {
      html += escapeHtml(source[index]);
      index += 1;
    }
  }

  return html;
}

for (const block of document.querySelectorAll("code[data-lang='ts']")) {
  block.innerHTML = highlightSource(block.textContent, TS_PATTERNS);
}

for (const block of document.querySelectorAll("code[data-lang='sh']")) {
  block.innerHTML = highlightSource(block.textContent, [
    { type: "fn", regex: /^(?:npm|pnpm|yarn|bun)\b/y }
  ]);
}

/* ---------- Copy buttons ---------- */

for (const button of document.querySelectorAll("[data-copy]")) {
  const originalLabel = button.textContent.trim();

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add("copied");
      if (originalLabel) {
        button.textContent = "Copied!";
      }
      setTimeout(() => {
        button.classList.remove("copied");
        if (originalLabel) {
          button.textContent = originalLabel;
        }
      }, 1500);
    } catch {
      /* clipboard unavailable: ignore */
    }
  });
}

/* ---------- Package manager tabs ---------- */

const tabContainer = document.querySelector("[data-pm-tabs]");

if (tabContainer) {
  const tabs = [...tabContainer.querySelectorAll("[role='tab']")];
  const panels = [...tabContainer.querySelectorAll("[role='tabpanel']")];

  const selectTab = (tab) => {
    for (const t of tabs) {
      t.setAttribute("aria-selected", String(t === tab));
    }
    for (const panel of panels) {
      panel.hidden = panel.id !== tab.getAttribute("aria-controls");
    }
  };

  for (const [i, tab] of tabs.entries()) {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      const offset =
        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (offset === 0) {
        return;
      }
      event.preventDefault();
      const next = tabs[(i + offset + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  }
}

/* ---------- Lookup demo ---------- */

const form = document.querySelector("[data-demo-form]");
const input = document.querySelector("[data-demo-input]");
const result = document.querySelector("[data-demo-result]");
const statusMessage = document.querySelector("[data-demo-status]");
const submitButton = document.querySelector("[data-demo-submit]");

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

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.querySelector(".spinner").hidden = !loading;
  submitButton.querySelector(".submit-label").textContent = loading
    ? "検索中"
    : "検索";
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

    const postal = document.createElement("span");
    postal.className = "result-postal";
    postal.textContent = `〒${formatPostalCode(address.postalCode)}`;

    const title = document.createElement("h3");
    title.textContent = `${address.prefecture}${address.city}${address.town}`;

    item.append(postal, title);

    const kanaText = [address.prefectureKana, address.cityKana, address.townKana]
      .filter(Boolean)
      .join(" ");

    if (kanaText) {
      const kana = document.createElement("p");
      kana.textContent = kanaText;
      item.append(kana);
    }

    result.append(item);
  }

  result.hidden = false;
}

const prefixCache = new Map();
let activeController = null;

async function lookupPostalCode(rawValue, signal) {
  const postalCode = normalizePostalCode(rawValue);

  if (!/^\d{7}$/.test(postalCode)) {
    return { kind: "invalid", addresses: [] };
  }

  const prefix = postalCode.slice(0, 3);
  let data = prefixCache.get(prefix);

  if (!data) {
    const response = await fetch(`${DATA_BASE_URL}/${prefix}.json`, { signal });

    if (response.status === 404) {
      data = {};
    } else if (!response.ok) {
      throw new Error(`Unexpected status: ${response.status}`);
    } else {
      data = await response.json();
    }

    prefixCache.set(prefix, data);
  }

  const addresses = Array.isArray(data[postalCode]) ? data[postalCode] : [];

  return {
    kind: addresses.length > 0 ? "found" : "not-found",
    addresses
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  activeController?.abort();
  activeController = new AbortController();
  const { signal } = activeController;

  clearResult();
  setStatus("検索しています...", "neutral");
  setLoading(true);

  try {
    const lookupResult = await lookupPostalCode(input.value, signal);

    if (signal.aborted) {
      return;
    }

    if (lookupResult.kind === "invalid") {
      setStatus("7桁の郵便番号を入力してください。", "error");
      return;
    }

    if (lookupResult.addresses.length === 0) {
      setStatus("住所候補が見つかりませんでした。", "empty");
      return;
    }

    renderAddresses(lookupResult.addresses);
    setStatus(`${lookupResult.addresses.length}件の住所候補が見つかりました。`, "success");
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    setStatus("取得に失敗しました。時間をおいて再度お試しください。", "error");
  } finally {
    if (!signal.aborted) {
      setLoading(false);
    }
  }
});

for (const chip of document.querySelectorAll("[data-demo-example]")) {
  chip.addEventListener("click", () => {
    input.value = chip.dataset.demoExample;
    form.requestSubmit();
  });
}
