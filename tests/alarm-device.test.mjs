import assert from 'node:assert/strict';
import test from 'node:test';
import { alarmDeviceProfile } from '../src/services/alarm-device.ts';

test('manufacturer aliases share phone guidance and confirmation namespace', () => {
  for (const [expected, brands] of Object.entries({ xiaomi: ['Xiaomi', 'Redmi', 'POCO'], samsung: ['SAMSUNG'], oppo: ['OPPO', 'Realme', 'OnePlus'], vivo: ['vivo', 'iQOO'], huawei: ['Huawei', 'Honor'] })) {
    for (const brand of brands) {
      const profile = alarmDeviceProfile(brand);
      assert.equal(profile.id, expected);
      assert.ok(profile.steps.length);
      assert.equal(new Set(profile.steps.map(step => step.id)).size, profile.steps.length);
    }
  }
});
test('Pixel and unknown phones receive generic guidance without Xiaomi labels', () => {
  for (const brand of ['Google', 'Motorola', '', 'Nothing']) {
    const profile = alarmDeviceProfile(brand);
    assert.equal(profile.id, 'android');
    assert.equal(profile.steps[0].settings, 'battery');
    assert.doesNotMatch(JSON.stringify(profile), /MIUI|Xiaomi|Auto-start/);
  }
});
test('Samsung guidance explicitly covers deep sleeping apps', () => {
  assert.match(alarmDeviceProfile('Samsung').steps[0].guidance, /Deep sleeping/);
});
