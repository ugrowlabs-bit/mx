import { currencyCodes, destinationByPath, destinations, flag } from "./data.js";
import { interpolate, messages } from "./i18n.js";
import { RATE_STORAGE_KEY, buildRateUrl, convert, isFresh, parseRateResponse } from "./rates.js";

const pageDestination = destinationByPath(document.documentElement.dataset.destination);
const locale = pageDestination?.locale || "en";
const text = messages(locale);
const selectionKey = "fx-selected-currencies-v1";
const initialCurrencies = [...new Set(["KRW", pageDestination?.currency || "THB", "USD"])];

const fieldsRoot = document.querySelector("#currencyFields");
const countText = document.querySelector("#currencyCount");
const statusText = document.querySelector("#rateStatus");
const statusDot = document.querySelector("#statusDot");
const refreshButton = document.querySelector("#refreshButton");
const installButton = document.querySelector("#installButton");
const dialog = document.querySelector("#currencyDialog");
const searchInput = document.querySelector("#currencySearch");
const destinationList = document.querySelector("#destinationList");
const emptyState = document.querySelector("#emptyState");

let selectedCurrencies = loadSelection();
let rateState = loadRates();
let activeCurrency = selectedCurrencies[0];
let activeAmount = 100;
let deferredInstallPrompt = null;

function loadSelection() {
  try {
    const stored = JSON.parse(localStorage.getItem(selectionKey));
    const valid = stored?.filter((code) => currencyCodes.includes(code));
    const selection = valid?.length ? [...new Set(valid)] : initialCurrencies;
    if (pageDestination && !selection.includes(pageDestination.currency)) selection.splice(1, 0, pageDestination.currency);
    return selection;
  } catch {
    return initialCurrencies;
  }
}

function loadRates() {
  try {
    return JSON.parse(localStorage.getItem(RATE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveSelection() {
  localStorage.setItem(selectionKey, JSON.stringify(selectedCurrencies));
}

function countryName(country) {
  return new Intl.DisplayNames([locale], { type: "region" }).of(country);
}

function currencyName(code) {
  return new Intl.DisplayNames([locale], { type: "currency" }).of(code);
}

function currencySymbol(code) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
    .formatToParts(0).find((part) => part.type === "currency")?.value || code;
}

function parseAmount(value) {
  const group = new Intl.NumberFormat(locale).formatToParts(12345).find((part) => part.type === "group")?.value;
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.2).find((part) => part.type === "decimal")?.value || ".";
  let normalized = value;
  if (group) normalized = normalized.split(group).join("");
  normalized = normalized.split(decimal).join(".").replace(/[^0-9.]/g, "");
  const [whole = "", ...fractions] = normalized.split(".");
  const amount = Number(`${whole || "0"}${fractions.length ? `.${fractions.join("")}` : ""}`);
  return Number.isFinite(amount) ? amount : null;
}

function formatValue(value, code) {
  const zeroDecimal = ["KRW", "JPY", "VND", "IDR"].includes(code);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: zeroDecimal ? 0 : 2, useGrouping: true }).format(value);
}

function createCurrencyRow(code, index) {
  const label = document.createElement("div");
  label.className = `currency-field${index === 0 ? " home-currency" : ""}`;
  label.dataset.currency = code;
  label.innerHTML = `
    <span class="currency-symbol">${currencySymbol(code)}</span>
    <label class="currency-meta" for="currency-${code}"><strong>${code}</strong><small>${currencyName(code)}</small></label>
    <input id="currency-${code}" inputmode="decimal" autocomplete="off" aria-label="${currencyName(code)}" placeholder="0" />
    <div class="row-actions">
      <button type="button" data-action="up" title="${text.moveUp}" aria-label="${text.moveUp}">↑</button>
      <button type="button" data-action="down" title="${text.moveDown}" aria-label="${text.moveDown}">↓</button>
      <button type="button" data-action="remove" title="${text.remove}" aria-label="${text.remove}">×</button>
    </div>
  `;

  const input = label.querySelector("input");
  input.addEventListener("input", () => updateFrom(code, input.value));
  input.addEventListener("focus", () => {
    activeCurrency = code;
    label.classList.add("active");
  });
  input.addEventListener("blur", () => label.classList.remove("active"));
  label.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleRowAction(code, button.dataset.action)));
  return label;
}

function renderCurrencies() {
  fieldsRoot.replaceChildren(...selectedCurrencies.map(createCurrencyRow));
  countText.textContent = String(selectedCurrencies.length);
  const activeInput = fieldsRoot.querySelector(`[data-currency="${activeCurrency}"] input`);
  if (activeInput) activeInput.value = formatValue(activeAmount, activeCurrency);
  updateAllValues();
}

function handleRowAction(code, action) {
  const index = selectedCurrencies.indexOf(code);
  if (action === "remove" && selectedCurrencies.length > 1) {
    selectedCurrencies.splice(index, 1);
    if (activeCurrency === code) activeCurrency = selectedCurrencies[0];
  } else if (action === "up" && index > 0) {
    [selectedCurrencies[index - 1], selectedCurrencies[index]] = [selectedCurrencies[index], selectedCurrencies[index - 1]];
  } else if (action === "down" && index < selectedCurrencies.length - 1) {
    [selectedCurrencies[index + 1], selectedCurrencies[index]] = [selectedCurrencies[index], selectedCurrencies[index + 1]];
  }
  saveSelection();
  renderCurrencies();
}

function updateFrom(code, rawValue) {
  const amount = parseAmount(rawValue);
  if (amount === null) return;
  activeCurrency = code;
  activeAmount = amount;
  updateAllValues();
}

function updateAllValues() {
  if (!rateState?.rates || !rateState.rates[activeCurrency]) return;
  const values = convert(activeAmount, activeCurrency, rateState.rates);
  for (const code of selectedCurrencies) {
    if (code === activeCurrency) continue;
    const input = fieldsRoot.querySelector(`[data-currency="${code}"] input`);
    if (input && Number.isFinite(values?.[code])) input.value = formatValue(values[code], code);
  }
}

function renderDestinations(query = "") {
  const normalized = query.trim().toLocaleLowerCase(locale);
  const matches = destinations.filter((item) => {
    const searchText = `${countryName(item.country)} ${item.currency} ${currencyName(item.currency)}`.toLocaleLowerCase(locale);
    return !normalized || searchText.includes(normalized);
  });
  destinationList.replaceChildren(...matches.map((item) => {
    const button = document.createElement("button");
    const added = selectedCurrencies.includes(item.currency);
    button.type = "button";
    button.className = "destination-option";
    button.disabled = added;
    button.innerHTML = `<span class="flag">${flag(item.country)}</span><span><strong>${countryName(item.country)}</strong><small>${item.currency} · ${currencyName(item.currency)}</small></span><b>${added ? "✓" : "+"}</b>`;
    button.addEventListener("click", () => addCurrency(item.currency));
    return button;
  }));
  emptyState.hidden = matches.length > 0;
}

async function addCurrency(code) {
  if (!selectedCurrencies.includes(code)) {
    selectedCurrencies.push(code);
    saveSelection();
    renderCurrencies();
    await refreshRates();
  }
  dialog.close();
}

function showRateStatus(kind, message) {
  statusDot.dataset.status = kind;
  statusText.textContent = message;
}

function describeTimestamp(timestamp) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}

async function refreshRates({ force = false } = {}) {
  if (!force && isFresh(rateState, selectedCurrencies)) {
    showRateStatus("fresh", interpolate(text.updated, { time: describeTimestamp(rateState.fetchedAt) }));
    updateAllValues();
    return;
  }

  refreshButton.disabled = true;
  showRateStatus("loading", text.loading);
  try {
    const response = await fetch(buildRateUrl(selectedCurrencies), { cache: "no-store" });
    if (!response.ok) throw new Error(`Rate request failed (${response.status})`);
    rateState = parseRateResponse(await response.json());
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(rateState));
    showRateStatus("fresh", interpolate(text.updated, { time: describeTimestamp(rateState.fetchedAt) }));
    updateAllValues();
  } catch (error) {
    if (selectedCurrencies.every((code) => Number.isFinite(rateState?.rates?.[code]))) {
      showRateStatus("cached", interpolate(text.cached, { time: describeTimestamp(rateState.fetchedAt) }));
    } else {
      showRateStatus("error", text.error);
    }
    console.error(error);
  } finally {
    refreshButton.disabled = false;
  }
}

function applyTranslations() {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.querySelector("#eyebrow").textContent = text.eyebrow;
  document.querySelector("#intro").textContent = text.intro;
  document.querySelector("#selectedTitle").textContent = text.selected;
  document.querySelector("#addButton").lastChild.textContent = ` ${text.add}`;
  installButton.textContent = text.install;
  refreshButton.textContent = text.refresh;
  document.querySelector("#notice").textContent = text.notice;
  searchInput.placeholder = text.search;
  document.querySelector("#popularTitle").textContent = text.popular;
  emptyState.textContent = text.empty;
  document.querySelector("#closeDialog").ariaLabel = text.close;
}

document.querySelector("#addButton").addEventListener("click", () => {
  searchInput.value = "";
  renderDestinations();
  dialog.showModal();
  searchInput.focus();
});
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
searchInput.addEventListener("input", () => renderDestinations(searchInput.value));
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
  window.addEventListener("load", () => navigator.serviceWorker.register(new URL("../service-worker.js", import.meta.url)));
}

applyTranslations();
renderCurrencies();
refreshRates();
setInterval(() => refreshRates(), 60 * 1000);
