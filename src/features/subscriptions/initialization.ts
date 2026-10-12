import { NativeModules } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { getRevenueCatApiKey } from './config';

// Reuse initialization across provider mounts and React Strict Mode.
let initialization: Promise<void> | null = null;

export async function ensureConfigured() {
  if (!__DEV__) throw new Error('Purchases are only enabled in development.');
  const apiKey = getRevenueCatApiKey();
  // isConfigured() returns false for both an unconfigured SDK and a missing
  // native module. Check the latter before calling any native SDK methods.
  if (!NativeModules.RNPurchases) {
    throw new Error('Purchases are unavailable in this installed app. A new native development build with RevenueCat is required.');
  }
  if (!initialization) {
    initialization = (async () => {
      if (!await Purchases.isConfigured()) {
        // This SDK method returns a promise; await it so rejection is handled.
        await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
        Purchases.configure({ apiKey }); // Persists an anonymous App User ID.
      }
    })().catch(error => { initialization = null; throw error; });
  }
  await initialization;
}
