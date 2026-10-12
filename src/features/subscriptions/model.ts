import { PACKAGE_TYPE, PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesOffering } from 'react-native-purchases';
import { PRO_ENTITLEMENT } from './config';

export const PLAN_TYPES = [
  { id: 'lifetime', title: 'Lifetime', detail: 'One-time purchase', type: PACKAGE_TYPE.LIFETIME },
  { id: 'yearly', title: 'Yearly', detail: 'Renews every year', type: PACKAGE_TYPE.ANNUAL },
  { id: 'monthly', title: 'Monthly', detail: 'Renews every month', type: PACKAGE_TYPE.MONTHLY },
] as const;

export function hasPro(info: CustomerInfo | null) {
  return info?.entitlements.active[PRO_ENTITLEMENT]?.isActive === true;
}

export function getPlans(offering: PurchasesOffering | null) {
  return PLAN_TYPES.map(plan => ({
    ...plan,
    package: offering?.availablePackages.find(pkg => pkg.packageType === plan.type) ?? null,
  }));
}

export function purchaseWasCancelled(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const e = error as { userCancelled?: boolean; code?: unknown };
  return e.userCancelled === true || e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function purchaseErrorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
    return 'Your payment is pending. Pro will unlock once the store confirms it.';
  }
  if (code === PURCHASES_ERROR_CODE.NETWORK_ERROR) return 'Unable to reach the store. Check your connection and try again.';
  if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) return 'You already own this product. Try Restore purchases.';
  if (code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) return 'Purchases are not allowed on this device or store account.';
  if (code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR) return 'Plans are unavailable right now. Please try again later.';
  return error instanceof Error ? error.message : 'We could not complete this request. Please try again.';
}
