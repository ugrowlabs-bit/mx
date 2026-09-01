import test from "node:test";
import assert from "node:assert/strict";
import { currencyCodes, localePages } from "../src/data.js";
import { buildRoute, parseRoute } from "../src/router.js";

test("언어 코드와 통화 순서를 URL에서 읽는다", () => {
  const route = parseRoute("/mx/ko/krw/usd/thb", "/mx/", localePages, currencyCodes);
  assert.equal(route.localePage.locale, "ko");
  assert.deepEqual(route.currencies, ["KRW", "USD", "THB"]);
});

test("언어와 통화 조합 URL을 만든다", () => {
  assert.equal(
    buildRoute(new URL("https://example.com/mx/"), "ko", ["KRW", "USD", "THB"]),
    "https://example.com/mx/ko/krw/usd/thb/",
  );
});

test("기본 영어 URL에도 언어 코드를 포함한다", () => {
  assert.equal(buildRoute(new URL("https://example.com/mx/"), "en", ["USD"]), "https://example.com/mx/en/usd/");
  assert.equal(buildRoute(new URL("https://example.com/mx/"), "en", ["USD", "EUR"]), "https://example.com/mx/en/usd/eur/");
});

test("대소문자와 중복·지원하지 않는 통화를 정규화한다", () => {
  const route = parseRoute("/mx/KO/krw/KRW/xxx/jpy/", "/mx/", localePages, currencyCodes);
  assert.equal(route.localePage.locale, "ko");
  assert.deepEqual(route.currencies, ["KRW", "JPY"]);
});
