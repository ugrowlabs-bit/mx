import test from "node:test";
import assert from "node:assert/strict";
import { RATE_TTL_MS, convert, isFresh, parseRateResponse } from "../src/rates.js";

const response = [
  { date: "2026-08-23", base: "THB", quote: "KRW", rate: 42.381 },
  { date: "2026-08-23", base: "THB", quote: "USD", rate: 0.03052 },
];

test("API 응답을 내부 환율 형태로 변환한다", () => {
  assert.deepEqual(parseRateResponse(response, 100), {
    rates: { THB: 1, KRW: 42.381, USD: 0.03052 },
    fetchedAt: 100,
    rateDate: "2026-08-23",
  });
});

test("마지막 성공 갱신 후 한 시간 동안 캐시를 사용한다", () => {
  const cached = parseRateResponse(response, 1_000);
  assert.equal(isFresh(cached, 1_000 + RATE_TTL_MS - 1), true);
  assert.equal(isFresh(cached, 1_000 + RATE_TTL_MS), false);
});

test("어느 통화를 입력해도 나머지 통화를 계산한다", () => {
  const rates = { THB: 1, KRW: 40, USD: 0.03 };
  assert.deepEqual(convert(100, "THB", rates), { THB: 100, KRW: 4000, USD: 3 });
  assert.deepEqual(convert(4000, "KRW", rates), { THB: 100, KRW: 4000, USD: 3 });
});

test("필요한 통화가 없는 응답은 거부한다", () => {
  assert.throws(() => parseRateResponse(response.slice(0, 1)), /필요한 통화/);
});
