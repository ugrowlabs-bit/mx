export const RATE_TTL_MS = 60 * 60 * 1000;
export const RATE_STORAGE_KEY = "fx-rates-v2";
export const RATE_API_ROOT = "https://api.frankfurter.dev/v2/rates";

export function buildRateUrl(currencies, base = "KRW") {
  const quotes = [...new Set(currencies)].filter((code) => code !== base).sort();
  const params = new URLSearchParams({ base });
  if (quotes.length) params.set("quotes", quotes.join(","));
  return `${RATE_API_ROOT}?${params}`;
}

export function isFresh(cached, requiredCurrencies = [], now = Date.now()) {
  return Boolean(
    cached?.fetchedAt &&
      cached?.base &&
      cached?.rates?.[cached.base] === 1 &&
      requiredCurrencies.every((code) => Number.isFinite(cached?.rates?.[code])) &&
      now - cached.fetchedAt < RATE_TTL_MS,
  );
}

export function parseRateResponse(rows, base = "KRW", fetchedAt = Date.now()) {
  if (!Array.isArray(rows)) throw new Error("Invalid rate response.");

  const rates = { [base]: 1 };
  let rateDate = null;

  for (const row of rows) {
    if (row.base === base && typeof row.quote === "string" && Number.isFinite(row.rate)) {
      rates[row.quote] = row.rate;
      rateDate = row.date || rateDate;
    }
  }

  if (Object.keys(rates).length < 2) throw new Error("No requested rates were returned.");
  return { base, rates, fetchedAt, rateDate };
}

export function convert(amount, fromCurrency, rates) {
  if (!Number.isFinite(amount) || !Number.isFinite(rates?.[fromCurrency])) return null;
  const amountInBase = amount / rates[fromCurrency];
  return Object.fromEntries(Object.entries(rates).map(([currency, rate]) => [currency, amountInBase * rate]));
}
