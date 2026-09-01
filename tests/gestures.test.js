import test from "node:test";
import assert from "node:assert/strict";
import { SWIPE_DELETE_THRESHOLD, canStartSwipe, shouldDeleteAfterSwipe } from "../src/gestures.js";

test("좌우 어느 방향이든 임계값 이상 스와이프하면 삭제한다", () => {
  assert.equal(shouldDeleteAfterSwipe(SWIPE_DELETE_THRESHOLD, 3), true);
  assert.equal(shouldDeleteAfterSwipe(-SWIPE_DELETE_THRESHOLD, 3), true);
  assert.equal(shouldDeleteAfterSwipe(SWIPE_DELETE_THRESHOLD - 1, 3), false);
  assert.equal(shouldDeleteAfterSwipe(-(SWIPE_DELETE_THRESHOLD - 1), 3), false);
});

test("마지막 통화 한 개는 스와이프로 삭제하지 않는다", () => {
  assert.equal(shouldDeleteAfterSwipe(110, 1), false);
  assert.equal(shouldDeleteAfterSwipe(-110, 1), false);
});

test("숫자 입력창에서 시작한 스와이프를 허용한다", () => {
  const input = { closest: (selector) => selector === "input" ? input : null };
  assert.equal(canStartSwipe(input), true);
});

test("드래그 손잡이에서 시작한 터치는 스와이프로 처리하지 않는다", () => {
  const handle = { closest: (selector) => selector === ".drag-handle" ? handle : null };
  assert.equal(canStartSwipe(handle), false);
});
