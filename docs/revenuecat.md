# RevenueCat in Aarambh

The app uses `react-native-purchases` and `react-native-purchases-ui` 10.12.2 on Expo SDK 57. RevenueCat is currently **development-only** (`__DEV__`). Production does not mount the subscription provider, hides the Pro entry point, redirects `/pro` to home, and blocks SDK initialization. Setting production keys does not enable subscriptions; explicitly remove the development guards when ready to launch. This integrates the client; no RevenueCat or store dashboard changes have been made. No APK has been built. No existing content has been assigned to Pro, because a premium feature list has not been specified.

## 1. Install with npm

Already completed:

```sh
npm install --save react-native-purchases react-native-purchases-ui
```

The native SDKs autolink. Do not use `react-native link` or add the package names as Expo config plugins. Aarambh's own `plugins/with-revenuecat.js` config plugin preserves Android MainActivity's `singleTop` launch mode during prebuild. The existing local Android manifest was updated too; the alarm's separate activity is unchanged.

Native dependencies require a new native build before purchases can be exercised. The old APK does not acquire native SDKs through Metro or an OTA update. Expo Go has mock preview APIs, so this app explicitly blocks purchases there to avoid mistaking mock access for paid access. A native development build is needed for Test Store, Paywalls, and Customer Center testing. Wait for explicit authorization before building an APK.

Sources: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [RevenueCat React Native installation](https://www.revenuecat.com/docs/getting-started/installation/reactnative), [RevenueCat with Expo](https://www.revenuecat.com/docs/getting-started/installation/expo).

## 2. API key and environments

`src/features/subscriptions/config.ts` contains the supplied public Test Store key:

```ts
export const PRO_ENTITLEMENT = 'aarambh_pro';
export const TEST_API_KEY = 'test_jkJjtVGPLPmrwjYMdMqgTQEjHPn';
```

Development defaults to Test Store. To test actual Apple/Google sandbox purchases, use the corresponding public SDK keys from RevenueCat in `.env.local`:

```dotenv
EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=false
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_YOUR_PUBLIC_SDK_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_YOUR_PUBLIC_SDK_KEY
```

Currently production skips initialization and needs no RevenueCat key. After subscriptions are enabled for production, release mode requires a platform key and rejects `test_` keys. If you later authorize a release-mode internal build specifically for Test Store, first introduce an explicit testing environment flag with a production safeguard; the current Test Store path is development-only.

Public SDK keys belong in client configuration; never include a RevenueCat secret REST API key in `EXPO_PUBLIC_*` variables. Restart Metro after changing public environment variables. Provide production keys to the build/update environment as well.

Sources: [Configure the SDK](https://www.revenuecat.com/docs/getting-started/configuring-sdk), [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).

## 3. Configure products and entitlement in RevenueCat

In your Aarambh project, configure the Test Store first:

| Product identifier | Product type | Duration | Attach to entitlement | Offering package |
| --- | --- | --- | --- | --- |
| `lifetime` | Non-consumable / one-time | No expiration | `aarambh_pro` | Lifetime (`$rc_lifetime`) |
| `yearly` | Auto-renewing subscription | 1 year | `aarambh_pro` | Annual (`$rc_annual`) |
| `monthly` | Auto-renewing subscription | 1 month | `aarambh_pro` | Monthly (`$rc_monthly`) |

1. Create all three products in the Test Store, choosing their prices and subscription durations.
2. Create the entitlement **`aarambh_pro`** exactly, including casing. Attach all three products.
3. Create an offering, for example **`default`**, and set it as the **current offering**.
4. Add standard Lifetime, Annual, and Monthly packages with the product mappings above. Product IDs, package IDs, and offering IDs are different concepts; `yearly` is the product, while `$rc_annual` is the standard package.
5. Design and publish a RevenueCat Paywall attached to that offering. Include the three packages, restore action, close control, accurate renewal terms, and your real terms/privacy links. Prices come from the store; the app uses `product.priceString`, never a hardcoded currency or amount.

For production, create corresponding store products in App Store Connect and Google Play Console and import/map them in RevenueCat:

- Apple: lifetime is a **non-consumable**. Place monthly and yearly in the same subscription group, with the correct access level. Enable the In-App Purchase capability, set Aarambh's actual iOS bundle identifier, and complete agreements, tax/banking, review metadata, and availability.
- Google: lifetime is a **non-consumable one-time product**. Monthly/yearly need active auto-renewing base plans with 1-month/1-year billing periods and regional pricing. Import the exact subscription/base-plan identifiers shown by RevenueCat; do not assume the Test Store ID alone represents a Google base plan.
- Attach all production products to the same entitlement and map each store's products to the same offering packages. Store IDs can differ from Test Store IDs; the app selects packages by type.
- Connect the store credentials and server notifications in RevenueCat. Test against the exact Android package `com.zrf.aarambh` and your actual iOS bundle identifier.

Dashboard prices, store credentials, store products, and Paywall design cannot be created with the public SDK key. They need your dashboard access and chosen prices/legal URLs.

Sources: [Entitlements](https://www.revenuecat.com/docs/getting-started/entitlements), [Displaying products and offerings](https://www.revenuecat.com/docs/getting-started/displaying-products), [Paywalls](https://www.revenuecat.com/docs/tools/paywalls).

## 4. Complete implementation files

- [Configuration and environment guards](../src/features/subscriptions/config.ts)
- [Entitlement, package mapping, and error handling](../src/features/subscriptions/model.ts)
- [Complete subscription provider](../src/features/subscriptions/provider.tsx)
- [Complete Pro screen](../src/app/pro.tsx)
- [App root integration](../src/app/_layout.tsx)
- [Android prebuild plugin](../plugins/with-revenuecat.js)

The provider configures once, retrieves CustomerInfo and the current offering independently, listens for CustomerInfo updates, refreshes on foreground, prevents overlapping billing actions, and removes listeners on cleanup. It preserves the last known CustomerInfo if a network request fails. SDK caching handles ordinary offline access; there is no separately persisted boolean that can grant Pro.

## 5. CustomerInfo, entitlement checks, and purchase examples

This complete component can be placed under the already-mounted `SubscriptionProvider` to guard a chosen premium feature:

```tsx
import { View, Text, Button } from 'react-native';
import { useSubscription } from '@/features/subscriptions/provider';

export function ProFeature() {
  const { customerInfo, isPro, busy, error, refresh, presentPaywall } = useSubscription();

  if (!customerInfo) {
    return <View>
      <Text>{error ?? 'Checking membership…'}</Text>
      <Button title="Retry" disabled={busy} onPress={() => { void refresh(); }} />
    </View>;
  }
  if (!isPro) {
    return <View>
      <Text>This feature requires Aarambh Pro.</Text>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      <Button title="Explore Pro" disabled={busy} onPress={() => { void presentPaywall(); }} />
    </View>;
  }
  return <Text>Your premium feature goes here.</Text>;
}
```

The SDK operations used inside the provider are:

```ts
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

// Run only after SDK configuration. The app provider performs this once.
async function getMembership() {
  const customerInfo = await Purchases.getCustomerInfo();
  return {
    customerInfo,
    isPro: customerInfo.entitlements.active['aarambh_pro']?.isActive === true,
  };
}

async function buyPackage(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo; // Recheck aarambh_pro; do not unlock on transaction alone.
}

async function showPaywall() {
  const offering = (await Purchases.getOfferings()).current;
  if (!offering) throw new Error('No current offering is configured.');
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    offering,
    requiredEntitlementIdentifier: 'aarambh_pro',
    displayCloseButton: true,
  });
  if (result === PAYWALL_RESULT.ERROR) throw new Error('Unable to complete paywall request.');
  // PURCHASED, RESTORED, CANCELLED, and NOT_PRESENTED all leave access
  // governed by the latest CustomerInfo, not by the result enum.
  return getMembership();
}
```

Use the hook actions in app components: `purchase(pkg)`, `restore()`, `presentPaywall()`, and `presentCustomerCenter()`. These wrap SDK exceptions, update state, and serialize operations. They return `CustomerInfo | null`; null means cancelled, failed, or another billing action was already running. Inspect the hook's `error` for a visible failure. A pending payment displays a pending message and grants no access until an active entitlement arrives. Restoring without an active entitlement shows a specific message on `/pro`.

The examples above show the underlying APIs; the complete provider contains their production error handling. Cancellation is quiet. Network, pending-payment, already-owned, restricted-purchase, and configuration errors have actionable messages. CustomerInfo's entitlement `expirationDate` and `willRenew` drive renewal/lifetime display. A cancelled subscription can still have active access until expiration; lifetime access does not require an entry in `activeSubscriptions`.

Sources: [CustomerInfo and subscription status](https://www.revenuecat.com/docs/customers/customer-info), [Making purchases](https://www.revenuecat.com/docs/getting-started/making-purchases), [Displaying React Native Paywalls](https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls).

## 6. Customer Center and identity

Configure Customer Center in the RevenueCat dashboard for subscription management, restoration, and available support/refund flows. `/pro` offers **Manage purchases** once CustomerInfo has loaded; users without an active subscription can still use restoration. The provider calls:

```ts
await RevenueCatUI.presentCustomerCenter({
  callbacks: {
    onRestoreCompleted: ({ customerInfo }) => {
      // Provider updates the app's CustomerInfo here.
    },
    onRestoreFailed: ({ error }) => {
      // Provider translates and displays this error.
    },
  },
});
await Purchases.invalidateCustomerInfoCache();
const customerInfo = await Purchases.getCustomerInfo();
```

Test the management flows in store sandbox as well as Test Store; Test Store does not validate real store cancellation, refunds, or payment collection. Configure the relevant Customer Center options and verify availability for your RevenueCat project before launch.

Aarambh currently has no consumer sign-in. RevenueCat's persisted anonymous App User ID is used; the owner/admin Firebase identity is deliberately not used as a customer identity. Restore is essential after reinstalling or moving devices. For future consumer authentication, use a stable internal customer ID, await `Purchases.logIn(userId)` before loading plans/purchasing, and apply its returned CustomerInfo. On sign-out, await `Purchases.logOut()` only for an identified user and clear prior customer state immediately. Serialize identity changes with billing actions, prevent late previous-user responses, and define RevenueCat's restore/transfer behavior. Do not generate a fresh anonymous ID on every launch or call logout routinely on startup.

Source: [Customer Center React Native integration](https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native).

## 7. Subscription management and verification

- Grant Pro only from `entitlements.active.aarambh_pro`. Never infer access from a product ID, transaction completion, renewal setting, or local toggle.
- CustomerInfo listeners report SDK updates, not a live server push connection. Foreground retrieval refreshes according to SDK cache policy. Recheck after purchases, restoration, and Customer Center; avoid aggressive polling or routinely clearing the cache.
- Keep purchases/restoration user initiated. Restore can invoke store authentication. Do not automatically purchase or restore on app startup.
- If subscriptions change tiers later, implement store-specific change/upgrade policies; a second purchase call alone does not define Google replacement/proration behavior. Existing Pro users currently see management rather than direct duplicate purchases.
- Protect premium backend content with server-side entitlement verification/webhooks, secure user identity, and authorization. The client check alone does not secure content already shipped in the app.
- Web purchases are currently blocked with a clear message. Add a RevenueCat Billing app, web products/key, and supported web management flows before enabling web billing.

Static and unit checks (no native build):

```sh
npx tsc --noEmit
npx eslint src/features/subscriptions src/app/pro.tsx src/app/_layout.tsx src/app/index.tsx plugins/with-revenuecat.js app.config.js
node --test tests/subscriptions.test.mjs
npm run test:alarm-navigation
```

After a native build is explicitly authorized, manually verify:

1. Each plan displays localized store pricing and purchases unlock `aarambh_pro`.
2. Paywall purchase and restore update membership; cancelling does not show an error or unlock access.
3. Failed/pending payments do not unlock access; completed pending payments update CustomerInfo.
4. Lifetime grants access with no active subscription; monthly/yearly expire and cancelled-but-unexpired access remains active.
5. Restore works after reinstall with an eligible store account, and no-purchase restoration explains the result.
6. Customer Center opens and membership refreshes after dismissal and returning from the store.
7. Network failure preserves cached membership, missing offering/products show unavailable states, and retry recovers.
8. Android payment verification, app deep links, alarm presentation, and back navigation work with MainActivity `singleTop`.
9. Release environment uses real store public keys, exact app identifiers, and production dashboard mappings.
