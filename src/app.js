import { currencyChoices, currencyCodes, destinationByPath, destinations, flag, localePages } from "./data.js";
import { canStartSwipe, shouldDeleteAfterSwipe } from "./gestures.js";
import { interpolate, messages } from "./i18n.js";
import { RATE_STORAGE_KEY, buildRateUrl, convert, isFresh, parseRateResponse } from "./rates.js";
import { buildRoute, parseRoute } from "./router.js";

const appRoot = new URL("../", import.meta.url);
const route = parseRoute(window.location.pathname, appRoot.pathname, localePages, currencyCodes);
const pageDestination = destinationByPath(document.documentElement.dataset.destination);
const requestedLocale = document.documentElement.dataset.locale;
const localePage = route.localePage || localePages.find((item) => item.locale === requestedLocale);
const locale = localePage?.locale || pageDestination?.locale || "en";
const text = messages(locale);
const selectionKey = "fx-selected-currencies-v1";
const initialCurrencies = [pageDestination?.currency || localePage?.currency || "USD"];

const fieldsRoot = document.querySelector("#currencyFields");
const countText = document.querySelector("#currencyCount");
const statusText = document.querySelector("#rateStatus");
const statusDot = document.querySelector("#statusDot");
const refreshButton = document.querySelector("#refreshButton");
const installButton = document.querySelector("#installButton");
const installDialog = document.querySelector("#installDialog");
const closeInstallDialog = document.querySelector("#closeInstallDialog");
const dialog = document.querySelector("#currencyDialog");
const searchInput = document.querySelector("#currencySearch");
const destinationList = document.querySelector("#destinationList");
const emptyState = document.querySelector("#emptyState");
const languageSelect = document.querySelector("#languageSelect");
const firstUseGuide = document.querySelector("#firstUseGuide");

document.querySelector('link[rel="icon"]').href = new URL("../icons/icon.svg", import.meta.url).href;
document.querySelector('link[rel="manifest"]').href = new URL("../manifest.webmanifest", import.meta.url).href;

const isBareRoot = window.location.pathname.replace(/\/+$/, "/") === appRoot.pathname.replace(/\/+$/, "/");
let selectedCurrencies = loadSelection();
let rateState = loadRates();
let activeCurrency = selectedCurrencies[0];
let activeAmount = 100;
let deferredInstallPrompt = null;

const installHelp = locale === "ko"
  ? {
      title: "바로가기 추가",
      ios: "Safari 아래의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요.",
      other: "브라우저 메뉴에서 ‘홈 화면에 추가’ 또는 ‘즐겨찾기’를 선택하세요.",
    }
  : {
      title: "Add a shortcut",
      ios: "Tap Share in Safari, then choose Add to Home Screen.",
      other: "Open your browser menu and choose Add to Home screen or Bookmark.",
    };
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
installButton.hidden = isStandalone;

function hasStoredSelection() {
  try {
    const stored = JSON.parse(localStorage.getItem(selectionKey));
    return Array.isArray(stored) && stored.some((code) => currencyCodes.includes(code));
  } catch {
    return false;
  }
}

if (firstUseGuide) firstUseGuide.hidden = !isBareRoot || hasStoredSelection();
syncRoute();

function loadSelection() {
  if (route.currencies.length) return route.currencies;
  if (isBareRoot || route.localePage) return initialCurrencies;
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
  if (firstUseGuide) firstUseGuide.hidden = true;
}

function syncRoute() {
  const localePath = localePages.find((item) => item.locale === locale)?.path || "en";
  history.replaceState(null, "", buildRoute(appRoot, localePath, selectedCurrencies));
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

function currencyUnit(code) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(1);
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
    <button class="drag-handle" type="button" aria-label="${text.moveUp} / ${text.moveDown}" title="${text.moveUp} / ${text.moveDown}">⠿</button>
    <span class="currency-symbol">${currencySymbol(code)}</span>
    <label class="currency-meta" for="currency-${code}"><strong>${code}</strong><small>${currencyName(code)}</small></label>
    <input id="currency-${code}" inputmode="decimal" autocomplete="off" aria-label="${currencyName(code)}" placeholder="0" />
  `;

  const input = label.querySelector("input");
  input.addEventListener("input", () => updateFrom(code, input.value));
  input.addEventListener("focus", () => {
    activeCurrency = code;
    label.classList.add("active");
    scrollConverterToTop();
  });
  input.addEventListener("blur", () => label.classList.remove("active"));
  const dragHandle = label.querySelector(".drag-handle");
  dragHandle.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    handleRowAction(code, event.key === "ArrowUp" ? "up" : "down");
  });
  attachDragEvents(dragHandle, label);
  attachSwipeEvents(label, code);
  return label;
}

function scrollConverterToTop() {
  if (!window.matchMedia("(max-width: 699px)").matches) return;
  const converter = document.querySelector(".converter");
  const align = () => converter.scrollIntoView({ behavior: "smooth", block: "start" });
  window.visualViewport?.addEventListener("resize", align, { once: true });
  requestAnimationFrame(align);
  setTimeout(align, 280);
}

function attachSwipeEvents(row, code) {
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let swiping = false;

  const reset = () => {
    row.classList.remove("swiping");
    row.style.removeProperty("transform");
    row.style.removeProperty("--swipe-shadow-x");
    offsetX = 0;
    swiping = false;
  };

  row.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !canStartSwipe(event.target)) return;
    startX = event.clientX;
    startY = event.clientY;
    offsetX = 0;
    swiping = true;
    row.setPointerCapture(event.pointerId);
  });

  row.addEventListener("pointermove", (event) => {
    if (!swiping) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      reset();
      return;
    }
    offsetX = Math.max(-110, Math.min(deltaX, 110));
    row.classList.add("swiping");
    row.style.setProperty("--swipe-shadow-x", offsetX < 0 ? "110px" : "-110px");
    row.style.transform = `translateX(${offsetX}px)`;
    event.preventDefault();
  });

  const finish = () => {
    if (!swiping) return;
    if (shouldDeleteAfterSwipe(offsetX, selectedCurrencies.length)) {
      reset();
      handleRowAction(code, "remove");
    } else {
      reset();
    }
  };

  row.addEventListener("pointerup", finish);
  row.addEventListener("pointercancel", reset);
  row.addEventListener("lostpointercapture", finish);
}

function attachDragEvents(handle, row) {
  let dragging = false;
  let pointerId = null;

  const finish = () => {
    if (!dragging) return;
    dragging = false;
    if (fieldsRoot.hasPointerCapture(pointerId)) fieldsRoot.releasePointerCapture(pointerId);
    fieldsRoot.removeEventListener("pointermove", move);
    fieldsRoot.removeEventListener("pointerup", finish);
    fieldsRoot.removeEventListener("pointercancel", finish);
    fieldsRoot.removeEventListener("lostpointercapture", finish);
    row.classList.remove("dragging");
    fieldsRoot.classList.remove("is-dragging");
    selectedCurrencies = [...fieldsRoot.querySelectorAll(".currency-field")].map((item) => item.dataset.currency);
    saveSelection();
    syncRoute();
    renderCurrencies();
  };

  const move = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    event.preventDefault();
    const siblings = [...fieldsRoot.querySelectorAll(".currency-field:not(.dragging)")];
    const next = siblings.find((item) => {
      const rect = item.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2;
    });
    fieldsRoot.insertBefore(row, next || null);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    pointerId = event.pointerId;
    fieldsRoot.setPointerCapture(pointerId);
    fieldsRoot.addEventListener("pointermove", move);
    fieldsRoot.addEventListener("pointerup", finish);
    fieldsRoot.addEventListener("pointercancel", finish);
    fieldsRoot.addEventListener("lostpointercapture", finish);
    row.classList.add("dragging");
    fieldsRoot.classList.add("is-dragging");
    event.preventDefault();
  });
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
  syncRoute();
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
  const matches = currencyChoices.filter((item) => {
    const searchText = `${countryName(item.country)} ${item.currency} ${currencyName(item.currency)}`.toLocaleLowerCase(locale);
    return !normalized || searchText.includes(normalized);
  });
  destinationList.replaceChildren(...matches.map((item) => {
    const button = document.createElement("button");
    const added = selectedCurrencies.includes(item.currency);
    button.type = "button";
    button.className = "destination-option";
    button.disabled = added;
    button.innerHTML = `<span class="flag">${flag(item.country)}</span><span><strong>${countryName(item.country)}</strong><small>${item.currency} · ${currencyName(item.currency)}</small><small class="currency-unit">1 ${item.currency} · ${currencyUnit(item.currency)}</small></span><b>${added ? "✓" : "+"}</b>`;
    button.addEventListener("click", () => addCurrency(item.currency));
    return button;
  }));
  emptyState.hidden = matches.length > 0;
}

async function addCurrency(code) {
  if (!selectedCurrencies.includes(code)) {
    selectedCurrencies.push(code);
    saveSelection();
    syncRoute();
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
  if (selectedCurrencies.length === 1) {
    const code = selectedCurrencies[0];
    rateState = { base: code, rates: { [code]: 1 }, fetchedAt: Date.now(), rateDate: null };
    showRateStatus("fresh", interpolate(text.updated, { time: describeTimestamp(rateState.fetchedAt) }));
    refreshButton.disabled = false;
    updateAllValues();
    return;
  }

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
  document.querySelector("#installTitle").textContent = installHelp.title;
  document.querySelector("#installInstructions").textContent = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? installHelp.ios
    : installHelp.other;
  closeInstallDialog.ariaLabel = text.close;
  refreshButton.textContent = text.refresh;
  document.querySelector("#notice").textContent = text.notice;
  searchInput.placeholder = text.search;
  document.querySelector("#popularTitle").textContent = text.popular;
  emptyState.textContent = text.empty;
  document.querySelector("#closeDialog").ariaLabel = text.close;
  languageSelect.ariaLabel = text.language;
  languageSelect.title = text.language;
}

function renderLanguageSelector() {
  languageSelect.replaceChildren(...localePages.map((item) => {
    const option = document.createElement("option");
    option.value = item.path;
    option.textContent = item.label;
    option.selected = item.locale === locale;
    return option;
  }));
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
languageSelect.addEventListener("change", () => {
  window.location.href = buildRoute(appRoot, languageSelect.value, selectedCurrencies);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (outcome === "accepted") installButton.hidden = true;
    return;
  }
  installDialog.showModal();
});
closeInstallDialog.addEventListener("click", () => installDialog.close());
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register(new URL("../service-worker.js", import.meta.url)));
}

applyTranslations();
renderLanguageSelector();
renderCurrencies();
refreshRates();
setInterval(() => refreshRates(), 60 * 1000);
