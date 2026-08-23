export const RATE_TTL_MS = 60 * 60 * 1000;
export const RATE_STORAGE_KEY = "baht-now-rates-v1";
export const RATE_API_URL = "https://api.frankfurter.dev/v2/rates?base=THB&quotes=KRW,USD";

export function isFresh(cached, now = Date.now()) {
  return Boolean(
    cached?.fetchedAt &&
      cached?.rates?.THB === 1 &&
      Number.isFinite(cached?.rates?.KRW) &&
      Number.isFinite(cached?.rates?.USD) &&
      now - cached.fetchedAt < RATE_TTL_MS,
  );
}

export function parseRateResponse(rows, fetchedAt = Date.now()) {
  if (!Array.isArray(rows)) throw new Error("잘못된 환율 응답입니다.");

  const rates = { THB: 1 };
  let rateDate = null;

  for (const row of rows) {
    if ((row.quote === "KRW" || row.quote === "USD") && Number.isFinite(row.rate)) {
      rates[row.quote] = row.rate;
      rateDate = row.date || rateDate;
    }
  }

  if (!Number.isFinite(rates.KRW) || !Number.isFinite(rates.USD)) {
    throw new Error("필요한 통화 환율이 없습니다.");
  }

  return { rates, fetchedAt, rateDate };
}

export function convert(amount, fromCurrency, rates) {
  if (!Number.isFinite(amount) || !Number.isFinite(rates?.[fromCurrency])) return null;
  const amountInBaht = amount / rates[fromCurrency];
  return Object.fromEntries(Object.entries(rates).map(([currency, rate]) => [currency, amountInBaht * rate]));
}
