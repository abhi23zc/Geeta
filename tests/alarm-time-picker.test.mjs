import assert from 'node:assert/strict';
import test from 'node:test';
import { nearestWheelIndex, shiftAlarmTime, wrapIndex } from '../src/services/alarm-time-picker.ts';

test('minute carry and borrow preserve noon, midnight, and reverse direction', () => {
  for (let time = 0; time < 1440; time++) {
    assert.equal(shiftAlarmTime(shiftAlarmTime(time, 1), -1), time);
    assert.equal(shiftAlarmTime(time, 1), (time + 1) % 1440);
  }
  assert.equal(shiftAlarmTime(11 * 60 + 59, 1), 12 * 60);
  assert.equal(shiftAlarmTime(23 * 60 + 59, 1), 0);
  assert.equal(shiftAlarmTime(0, -1), 1439);
  assert.equal(shiftAlarmTime(5 * 60 + 59, 121), 8 * 60);
});
test('hour gestures keep minutes, flip period at 11 to 12, and survive full cycles', () => {
  assert.equal(shiftAlarmTime(11 * 60 + 25, 60), 12 * 60 + 25);
  assert.equal(shiftAlarmTime(23 * 60 + 25, 60), 25);
  assert.equal(shiftAlarmTime(25, -60), 23 * 60 + 25);
  assert.equal(shiftAlarmTime(25, 12 * 60), 12 * 60 + 25);
});
test('external rollover uses the closest wheel copy without a spurious full rotation', () => {
  for (const size of [12, 60]) for (let current = size; current < size * 4; current++) {
    for (let target = 0; target < size; target++) {
      const next = nearestWheelIndex(current, target, size);
      assert.equal(wrapIndex(next, size), target);
      assert.ok(Math.abs(next - current) <= size / 2);
    }
  }
  assert.equal(nearestWheelIndex(179, 0, 60), 180);
  assert.equal(nearestWheelIndex(120, 59, 60), 119);
});
