export const SWIPE_DELETE_THRESHOLD = 72;

export function canStartSwipe(target) {
  return !target?.closest?.(".drag-handle");
}

export function shouldDeleteAfterSwipe(offsetX, currencyCount) {
  return currencyCount > 1 && Math.abs(offsetX) >= SWIPE_DELETE_THRESHOLD;
}
