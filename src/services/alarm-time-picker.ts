export const wrapIndex = (value: number, size: number) => ((value % size) + size) % size;
export const shiftAlarmTime = (minutes: number, delta: number) => wrapIndex(minutes + delta, 1440);
export function nearestWheelIndex(current: number, valueIndex: number, size: number) {
  return current + wrapIndex(valueIndex - wrapIndex(current, size) + Math.floor(size / 2), size) - Math.floor(size / 2);
}
