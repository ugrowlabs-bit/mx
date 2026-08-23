import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { currencyCodes, destinations } from "../src/data.js";
import { messages } from "../src/i18n.js";

test("25개 여행지와 필요한 통화 목록을 제공한다", () => {
  assert.equal(destinations.length, 25);
  assert.equal(new Set(destinations.map(({ path }) => path)).size, 25);
  assert.ok(currencyCodes.includes("KRW"));
  assert.ok(currencyCodes.includes("THB"));
  assert.ok(currencyCodes.includes("JPY"));
});

test("모든 여행지에 생성된 진입 페이지가 있다", async () => {
  await Promise.all(destinations.map(({ path }) => access(`${path}/index.html`)));
});

test("대표 locale이 영어 대신 번역 문자열을 제공한다", () => {
  assert.equal(messages("en").add, "Add currency");
  assert.equal(messages("ja").add, "通貨を追加");
  assert.equal(messages("ar").add, "إضافة عملة");
});
