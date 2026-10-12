import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const PRO_ENTITLEMENT = 'aarambh_pro';
export const TEST_API_KEY = 'test_jkJjtVGPLPmrwjYMdMqgTQEjHPn';
export const isPurchasePreview = Constants.appOwnership === 'expo';
export const isTestStore = __DEV__ && process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE !== 'false';

export function getRevenueCatApiKey() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new Error('Purchases are available in the Android and iOS apps.');
  }
  if (isPurchasePreview) throw new Error('Open a native development build to use purchases.');
  const key = isTestStore
    ? TEST_API_KEY
    : Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!key) throw new Error('Purchases are not configured for this app yet.');
  if (!isTestStore && key.startsWith('test_')) {
    throw new Error('A store API key is required outside Test Store mode.');
  }
  return key;
}
