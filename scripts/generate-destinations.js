import { mkdir, writeFile } from "node:fs/promises";
import { destinations, localePages } from "../src/data.js";

const appPage = ({ locale }, assetPrefix = "../") => `<!doctype html>
<html lang="${locale}" data-locale="${locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#fb6b35" />
    <meta name="description" content="Travel currency converter in ${locale}." />
    <link rel="manifest" href="${assetPrefix}manifest.webmanifest" />
    <link rel="icon" href="${assetPrefix}icons/icon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPrefix}styles.css?v=5" />
    <title>FX — Travel currency converter</title>
  </head>
  <body>
    <main class="app-shell">
      <header class="hero"><div><p class="eyebrow" id="eyebrow">TRAVEL MONEY, SIMPLIFIED</p><h1>FX</h1><p class="intro" id="intro">Compare every currency you need in one clear view.</p></div><div class="hero-actions"><select class="language-select" id="languageSelect" aria-label="Page language"></select><button class="install-button" id="installButton" type="button" hidden>Add to home screen</button></div></header>
      <section class="converter" aria-labelledby="selectedTitle"><div class="section-heading"><h2 id="selectedTitle">Selected currencies</h2><span id="currencyCount"></span></div><div id="currencyFields"></div><button class="add-button" id="addButton" type="button"><span>＋</span> Add currency</button></section>
      <section class="rate-card" aria-live="polite"><div class="status-line"><span class="status-dot" id="statusDot"></span><span id="rateStatus">Checking the latest rates…</span></div><button class="refresh-button" id="refreshButton" type="button">Refresh now</button></section>
      <p class="notice" id="notice">Reference rates only. Card and cash exchange rates may include fees and markup.</p>
    </main>
    <dialog class="currency-dialog" id="currencyDialog"><div class="dialog-header"><label class="search-box"><span>⌕</span><input id="currencySearch" type="search" autocomplete="off" placeholder="Search country or currency" /></label><button class="close-button" id="closeDialog" type="button" aria-label="Close">×</button></div><h2 id="popularTitle">Popular destinations</h2><div class="destination-list" id="destinationList"></div><p class="empty-state" id="emptyState" hidden>No matching destination</p></dialog>
    <noscript>JavaScript is required to use this converter.</noscript>
    <script type="module" src="${assetPrefix}src/app.js?v=5"></script>
  </body>
</html>
`;

const redirectPage = (languagePath) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta http-equiv="refresh" content="0; url=../${languagePath ? `${languagePath}/` : ""}" /><link rel="canonical" href="../${languagePath ? `${languagePath}/` : ""}" /><title>FX</title></head><body><script>location.replace("../${languagePath ? `${languagePath}/` : ""}")</script></body></html>
`;

for (const page of localePages) {
  const languagePath = page.path || "en";
  await mkdir(languagePath, { recursive: true });
  await writeFile(`${languagePath}/index.html`, appPage(page));
  await mkdir(`${languagePath}/krw/usd/thb`, { recursive: true });
  await writeFile(`${languagePath}/krw/usd/thb/index.html`, appPage(page, "../../../../"));
}

await mkdir("KO", { recursive: true });
await writeFile("KO/index.html", redirectPage("ko"));

for (const destination of destinations) {
  const languagePath = localePages.find(({ locale }) => locale === destination.locale)?.path
    ?? localePages.find(({ locale }) => locale === destination.locale.split("-")[0])?.path
    ?? "";
  await mkdir(destination.path, { recursive: true });
  await writeFile(`${destination.path}/index.html`, redirectPage(languagePath));
}

console.log(`Generated ${localePages.length} language pages with KRW/USD/THB presets, an uppercase KO alias, and ${destinations.length} compatibility redirects.`);
