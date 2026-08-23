import test from "node:test";
import assert from "node:assert/strict";
import { currencyCodes, localePages } from "../src/data.js";
import { buildRoute, parseRoute } from "../src/router.js";

test("언어 코드와 통화 순서를 URL에서 읽는다", () => {
  const route = parseRoute("/fx/ko/krw/usd/thb", "/fx/", localePages, currencyCodes);
  assert.equal(route.localePage.locale, "ko");
  assert.deepEqual(route.currencies, ["KRW", "USD", "THB"]);
});

test("언어와 통화 조합 URL을 만든다", () => {
  assert.equal(
    buildRoute(new URL("https://example.com/fx/"), "ko", ["KRW", "USD", "THB"]),
    "https://example.com/fx/ko/krw/usd/thb/",
  );
});

test("대소문자와 중복·지원하지 않는 통화를 정규화한다", () => {
  const route = parseRoute("/fx/KO/krw/KRW/xxx/jpy/", "/fx/", localePages, currencyCodes);
  assert.equal(route.localePage.locale, "ko");
  assert.deepEqual(route.currencies, ["KRW", "JPY"]);
});
