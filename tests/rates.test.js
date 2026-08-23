import test from "node:test";
import assert from "node:assert/strict";
import { RATE_TTL_MS, buildRateUrl, convert, isFresh, parseRateResponse } from "../src/rates.js";

const response = [
  { date: "2026-08-23", base: "KRW", quote: "THB", rate: 0.0236 },
  { date: "2026-08-23", base: "KRW", quote: "USD", rate: 0.00072 },
];

test("API 응답을 내부 환율 형태로 변환한다", () => {
  assert.deepEqual(parseRateResponse(response, "KRW", 100), {
    base: "KRW",
    rates: { KRW: 1, THB: 0.0236, USD: 0.00072 },
    fetchedAt: 100,
    rateDate: "2026-08-23",
  });
});

test("마지막 성공 갱신 후 한 시간 동안 캐시를 사용한다", () => {
  const cached = parseRateResponse(response, "KRW", 1_000);
  assert.equal(isFresh(cached, ["KRW", "THB", "USD"], 1_000 + RATE_TTL_MS - 1), true);
  assert.equal(isFresh(cached, ["JPY"], 1_000 + RATE_TTL_MS - 1), false);
  assert.equal(isFresh(cached, ["KRW", "THB"], 1_000 + RATE_TTL_MS), false);
});

test("선택한 통화를 중복 없이 API 주소에 넣는다", () => {
  assert.equal(buildRateUrl(["KRW", "USD", "JPY", "USD"]), "https://api.frankfurter.dev/v2/rates?base=KRW&quotes=JPY%2CUSD");
});

test("어느 통화를 입력해도 나머지 통화를 계산한다", () => {
  const rates = { THB: 1, KRW: 40, USD: 0.03 };
  assert.deepEqual(convert(100, "THB", rates), { THB: 100, KRW: 4000, USD: 3 });
  assert.deepEqual(convert(4000, "KRW", rates), { THB: 100, KRW: 4000, USD: 3 });
});

test("요청한 환율이 없는 응답은 거부한다", () => {
  assert.throws(() => parseRateResponse([], "KRW"), /No requested rates/);
});
