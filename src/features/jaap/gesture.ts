/** Shared by the native worklet and deterministic gesture tests. */
export function validPull(x: number, y: number, peak: number, pointers: number, cancelled = false) {
  'worklet';
  return !cancelled && pointers === 1 && y >= 40 && Math.abs(x) <= 28 && y >= peak - 12;
}
