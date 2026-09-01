import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { currencyChoices, currencyCodes, destinations, localePages } from "../src/data.js";
import { messages } from "../src/i18n.js";

test("25개 여행지와 필요한 통화 목록을 제공한다", () => {
  assert.equal(destinations.length, 25);
  assert.equal(new Set(destinations.map(({ path }) => path)).size, 25);
  assert.ok(currencyCodes.includes("KRW"));
  assert.ok(currencyCodes.includes("THB"));
  assert.ok(currencyCodes.includes("JPY"));
  assert.deepEqual(currencyChoices[0], { country: "KR", currency: "KRW" });
});

test("모든 여행지에 생성된 진입 페이지가 있다", async () => {
  await Promise.all(destinations.map(({ path }) => access(`${path}/index.html`)));
});

test("영어 루트와 언어 코드별 진입 페이지를 제공한다", async () => {
  await access("index.html");
  assert.equal(localePages[0].path, "en");
  assert.ok(localePages.some(({ path, locale }) => path === "ko" && locale === "ko"));
  await Promise.all(localePages.map(({ path }) => access(`${path}/index.html`)));
  await Promise.all(localePages.map(({ path }) => access(`${path}/krw/usd/thb/index.html`)));
  await Promise.all(localePages.map(({ path, locale, currency }) =>
    access(`${path}/${currency.toLowerCase()}/index.html`)));
  await access("KO/index.html");
});

test("대표 locale이 영어 대신 번역 문자열을 제공한다", () => {
  assert.equal(messages("en").add, "Add currency");
  assert.equal(messages("ko").add, "통화 추가");
  assert.equal(messages("ja").add, "通貨を追加");
  assert.equal(messages("ar").add, "إضافة عملة");
});

test("모든 언어 진입 페이지에 대표 기본 통화가 하나씩 지정되어 있다", () => {
  for (const page of localePages) assert.ok(currencyCodes.includes(page.currency), `${page.locale}: ${page.currency}`);
  assert.equal(localePages.find(({ locale }) => locale === "ko").currency, "KRW");
  assert.equal(localePages.find(({ locale }) => locale === "en").currency, "USD");
  assert.equal(localePages.find(({ locale }) => locale === "ja").currency, "JPY");
});

test("임의 통화 조합용 404 진입 페이지가 최신 앱 셸을 포함한다", async () => {
  const fallback = await readFile("404.html", "utf8");
  assert.match(fallback, /id="firstUseGuide"/);
  assert.match(fallback, /id="installDialog"/);
  assert.match(fallback, /src="\/mx\/src\/app\.js\?v=11"/);
});
