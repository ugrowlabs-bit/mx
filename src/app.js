import { RATE_API_URL, RATE_STORAGE_KEY, convert, isFresh, parseRateResponse } from "./rates.js";

const currencies = [
  { code: "THB", symbol: "฿", name: "태국 바트", locale: "th-TH", maximumFractionDigits: 2 },
  { code: "KRW", symbol: "₩", name: "대한민국 원", locale: "ko-KR", maximumFractionDigits: 0 },
  { code: "USD", symbol: "$", name: "미국 달러", locale: "en-US", maximumFractionDigits: 2 },
];

const fieldsRoot = document.querySelector("#currencyFields");
const statusText = document.querySelector("#rateStatus");
const statusDot = document.querySelector("#statusDot");
const refreshButton = document.querySelector("#refreshButton");
const installButton = document.querySelector("#installButton");

let rateState = loadRates();
let activeCurrency = "THB";
let deferredInstallPrompt = null;

const fields = Object.fromEntries(
  currencies.map((currency) => {
    const label = document.createElement("label");
    label.className = "currency-field";
    label.innerHTML = `
      <span class="currency-symbol">${currency.symbol}</span>
      <span class="currency-meta"><strong>${currency.code}</strong><small>${currency.name}</small></span>
      <input inputmode="decimal" autocomplete="off" aria-label="${currency.name}" placeholder="0" />
    `;
    fieldsRoot.append(label);
    const input = label.querySelector("input");
    input.addEventListener("input", () => updateFrom(currency.code, input.value));
    input.addEventListener("focus", () => {
      activeCurrency = currency.code;
      label.classList.add("active");
    });
    input.addEventListener("blur", () => label.classList.remove("active"));
    return [currency.code, input];
  }),
);

function loadRates() {
  try {
    return JSON.parse(localStorage.getItem(RATE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function parseAmount(value) {
  const normalized = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const [whole = "", ...fractions] = normalized.split(".");
  const amount = Number(`${whole || "0"}${fractions.length ? `.${fractions.join("")}` : ""}`);
  return Number.isFinite(amount) ? amount : null;
}

function formatValue(value, currencyCode) {
  const currency = currencies.find((item) => item.code === currencyCode);
  return new Intl.NumberFormat(currency.locale, {
    maximumFractionDigits: currency.maximumFractionDigits,
    useGrouping: true,
  }).format(value);
}

function updateFrom(currencyCode, rawValue) {
  activeCurrency = currencyCode;
  if (!rateState?.rates) return;
  const amount = parseAmount(rawValue);
  if (amount === null) return;
  const converted = convert(amount, currencyCode, rateState.rates);

  for (const currency of currencies) {
    if (currency.code !== currencyCode) fields[currency.code].value = formatValue(converted[currency.code], currency.code);
  }
}

function showRateStatus(kind, message) {
  statusDot.dataset.status = kind;
  statusText.textContent = message;
}

function describeTimestamp(timestamp) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

async function refreshRates({ force = false } = {}) {
  if (!force && isFresh(rateState)) {
    showRateStatus("fresh", `${describeTimestamp(rateState.fetchedAt)} 갱신 · 1시간마다 확인`);
    return;
  }

  refreshButton.disabled = true;
  showRateStatus("loading", "최신 환율을 확인하는 중…");

  try {
    const response = await fetch(RATE_API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`환율 요청 실패 (${response.status})`);
    rateState = parseRateResponse(await response.json());
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(rateState));
    showRateStatus("fresh", `${describeTimestamp(rateState.fetchedAt)} 갱신 · 1시간마다 확인`);

    const activeValue = fields[activeCurrency].value;
    if (activeValue) updateFrom(activeCurrency, activeValue);
  } catch (error) {
    if (rateState?.rates) {
      showRateStatus("cached", `오프라인 환율 · 마지막 갱신 ${describeTimestamp(rateState.fetchedAt)}`);
    } else {
      showRateStatus("error", "환율을 불러오지 못했습니다. 연결 후 다시 시도해 주세요.");
    }
    console.error(error);
  } finally {
    refreshButton.disabled = false;
  }
}

document.querySelectorAll("[data-baht]").forEach((button) => {
  button.addEventListener("click", () => {
    fields.THB.value = button.dataset.baht;
    updateFrom("THB", button.dataset.baht);
  });
});

refreshButton.addEventListener("click", () => refreshRates({ force: true }));

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}

fields.THB.value = "100";
if (rateState?.rates) updateFrom("THB", "100");
refreshRates();
setInterval(() => refreshRates(), 60 * 1000);
