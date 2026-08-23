export const destinations = [
  { path: "japan", country: "JP", currency: "JPY", locale: "ja" },
  { path: "taiwan", country: "TW", currency: "TWD", locale: "zh-TW" },
  { path: "china", country: "CN", currency: "CNY", locale: "zh-CN" },
  { path: "hong-kong", country: "HK", currency: "HKD", locale: "zh-TW" },
  { path: "macau", country: "MO", currency: "MOP", locale: "zh-TW" },
  { path: "thailand", country: "TH", currency: "THB", locale: "th" },
  { path: "vietnam", country: "VN", currency: "VND", locale: "vi" },
  { path: "philippines", country: "PH", currency: "PHP", locale: "fil" },
  { path: "singapore", country: "SG", currency: "SGD", locale: "en-SG" },
  { path: "malaysia", country: "MY", currency: "MYR", locale: "ms" },
  { path: "indonesia", country: "ID", currency: "IDR", locale: "id" },
  { path: "united-states", country: "US", currency: "USD", locale: "en-US" },
  { path: "guam", country: "GU", currency: "USD", locale: "en-US" },
  { path: "canada", country: "CA", currency: "CAD", locale: "en-CA" },
  { path: "australia", country: "AU", currency: "AUD", locale: "en-AU" },
  { path: "new-zealand", country: "NZ", currency: "NZD", locale: "en-NZ" },
  { path: "united-kingdom", country: "GB", currency: "GBP", locale: "en-GB" },
  { path: "france", country: "FR", currency: "EUR", locale: "fr" },
  { path: "germany", country: "DE", currency: "EUR", locale: "de" },
  { path: "italy", country: "IT", currency: "EUR", locale: "it" },
  { path: "spain", country: "ES", currency: "EUR", locale: "es" },
  { path: "switzerland", country: "CH", currency: "CHF", locale: "de-CH" },
  { path: "czechia", country: "CZ", currency: "CZK", locale: "cs" },
  { path: "turkiye", country: "TR", currency: "TRY", locale: "tr" },
  { path: "united-arab-emirates", country: "AE", currency: "AED", locale: "ar" },
];

export const currencyCodes = [...new Set(["KRW", "USD", ...destinations.map(({ currency }) => currency)])];

export const localePages = [
  { path: "", locale: "en", label: "English", currency: "USD" },
  { path: "ko", locale: "ko", label: "한국어", currency: "KRW" },
  { path: "ja", locale: "ja", label: "日本語", currency: "JPY" },
  { path: "zh-tw", locale: "zh-TW", label: "繁體中文", currency: "TWD" },
  { path: "zh-cn", locale: "zh-CN", label: "简体中文", currency: "CNY" },
  { path: "th", locale: "th", label: "ไทย", currency: "THB" },
  { path: "vi", locale: "vi", label: "Tiếng Việt", currency: "VND" },
  { path: "fil", locale: "fil", label: "Filipino", currency: "PHP" },
  { path: "ms", locale: "ms", label: "Bahasa Melayu", currency: "MYR" },
  { path: "id", locale: "id", label: "Bahasa Indonesia", currency: "IDR" },
  { path: "fr", locale: "fr", label: "Français", currency: "EUR" },
  { path: "de", locale: "de", label: "Deutsch", currency: "EUR" },
  { path: "it", locale: "it", label: "Italiano", currency: "EUR" },
  { path: "es", locale: "es", label: "Español", currency: "EUR" },
  { path: "cs", locale: "cs", label: "Čeština", currency: "CZK" },
  { path: "tr", locale: "tr", label: "Türkçe", currency: "TRY" },
  { path: "ar", locale: "ar", label: "العربية", currency: "AED" },
];

export function destinationByPath(path) {
  return destinations.find((item) => item.path === path);
}

export function flag(countryCode) {
  return [...countryCode].map((character) => String.fromCodePoint(127397 + character.charCodeAt())).join("");
}
