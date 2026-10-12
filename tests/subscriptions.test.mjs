import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the access decision without loading React Native native modules in Node.
const sdk = {
  PACKAGE_TYPE: { LIFETIME: 'LIFETIME', ANNUAL: 'ANNUAL', MONTHLY: 'MONTHLY' },
  PURCHASES_ERROR_CODE: {
    PURCHASE_CANCELLED_ERROR: '1', PAYMENT_PENDING_ERROR: '20', NETWORK_ERROR: '10',
    PRODUCT_ALREADY_PURCHASED_ERROR: '6', PURCHASE_NOT_ALLOWED_ERROR: '3', CONFIGURATION_ERROR: '23',
  },
};
const exports = {};
const source = ts.transpileModule(readFileSync(new URL('../src/features/subscriptions/model.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, { exports, Error, require: name => {
  if (name === 'react-native-purchases') return sdk;
  if (name === './config') return { PRO_ENTITLEMENT: 'aarambh_pro' };
  throw new Error(`Unexpected import: ${name}`);
} });
const info = active => ({ entitlements: { active }, activeSubscriptions: ['monthly'] });

test('unknown, expired, pending, and unrelated purchases do not unlock Pro', () => {
  assert.equal(exports.hasPro(null), false);
  assert.equal(exports.hasPro(info({})), false);
  assert.equal(exports.hasPro(info({ another_pro: { isActive: true } })), false);
  assert.equal(exports.hasPro(info({ aarambh_pro: { isActive: false } })), false);
});
test('lifetime and cancelled-but-unexpired subscriptions retain entitlement access', () => {
  assert.equal(exports.hasPro({ ...info({ aarambh_pro: { isActive: true, expirationDate: null } }), activeSubscriptions: [] }), true);
  assert.equal(exports.hasPro(info({ aarambh_pro: { isActive: true, willRenew: false } })), true);
});
test('offering package types work with standard RevenueCat package identifiers', () => {
  const packages = [
    { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { identifier: 'store.monthly' } },
    { identifier: '$rc_lifetime', packageType: 'LIFETIME', product: { identifier: 'store.lifetime' } },
    { identifier: '$rc_annual', packageType: 'ANNUAL', product: { identifier: 'store.yearly' } },
  ];
  const plans = exports.getPlans({ availablePackages: packages });
  assert.equal(plans[0].package, packages[1]);
  assert.equal(plans[1].package, packages[2]);
  assert.equal(plans[2].package, packages[0]);
  assert.ok(exports.getPlans(null).every(plan => plan.package === null));
});
test('cancellation is quiet and pending payment explains delayed access', () => {
  assert.equal(exports.purchaseWasCancelled({ userCancelled: true }), true);
  assert.equal(exports.purchaseWasCancelled({ code: '1' }), true);
  assert.equal(exports.purchaseWasCancelled({ code: '20' }), false);
  assert.match(exports.purchaseErrorMessage({ code: '20' }), /pending/);
  assert.match(exports.purchaseErrorMessage({ code: '10' }), /connection/);
  assert.match(exports.purchaseErrorMessage({ code: '6' }), /Restore/);
});

function initializerFixture(nativeAvailable, sdkOverrides = {}, development = true) {
  const calls = [];
  const purchases = {
    isConfigured: async () => { calls.push('isConfigured'); return false; },
    setLogLevel: async () => { calls.push('setLogLevel'); },
    configure: options => { calls.push(['configure', options.apiKey]); },
    ...sdkOverrides,
  };
  const initExports = {};
  const initSource = ts.transpileModule(readFileSync(new URL('../src/features/subscriptions/initialization.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(initSource, { exports: initExports, Error, __DEV__: development, require: name => {
    if (name === 'react-native') return { NativeModules: { RNPurchases: nativeAvailable ? {} : null } };
    if (name === 'react-native-purchases') return { __esModule: true, default: purchases, LOG_LEVEL: { DEBUG: 'DEBUG', ERROR: 'ERROR' } };
    if (name === './config') return { getRevenueCatApiKey: () => 'test_fixture' };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { ...initExports, calls };
}

test('an old native build gets a recoverable message without invoking the missing SDK', async () => {
  const f = initializerFixture(false);
  await assert.rejects(f.ensureConfigured(), /new native development build/);
  assert.deepEqual(f.calls, []);
});
test('log-level rejection is awaited and initialization can retry', async () => {
  let attempts = 0;
  const f = initializerFixture(true, { setLogLevel: async () => {
    if (++attempts === 1) throw new Error('Native initialization failed');
  } });
  await assert.rejects(f.ensureConfigured(), /Native initialization failed/);
  assert.ok(!f.calls.some(call => Array.isArray(call)));
  await f.ensureConfigured();
  assert.equal(attempts, 2);
  assert.equal(f.calls.filter(call => Array.isArray(call)).length, 1);
});
test('concurrent provider mounts configure the SDK only once', async () => {
  const f = initializerFixture(true);
  await Promise.all([f.ensureConfigured(), f.ensureConfigured()]);
  await f.ensureConfigured();
  assert.equal(f.calls.filter(call => call === 'isConfigured').length, 1);
  assert.equal(f.calls.filter(call => call === 'setLogLevel').length, 1);
  assert.equal(f.calls.filter(call => Array.isArray(call)).length, 1);
});

test('production cannot initialize RevenueCat even when native modules are installed', async () => {
  const f = initializerFixture(true, {}, false);
  await assert.rejects(f.ensureConfigured(), /only enabled in development/);
  assert.deepEqual(f.calls, []);
});
