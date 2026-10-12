import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { PRO_ENTITLEMENT } from './config';
import { ensureConfigured } from './initialization';
import { hasPro, purchaseErrorMessage, purchaseWasCancelled } from './model';

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  offering: PurchasesOffering | null;
  isPro: boolean;
  ready: boolean;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
  restore: () => Promise<CustomerInfo | null>;
  presentPaywall: () => Promise<CustomerInfo | null>;
  presentCustomerCenter: () => Promise<CustomerInfo | null>;
};
const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(false);
  const applyInfo = useCallback((info: CustomerInfo) => {
    if (mounted.current) setCustomerInfo(current =>
      current && Date.parse(current.requestDate) > Date.parse(info.requestDate) ? current : info);
  }, []);

  const refreshInfo = useCallback(async () => {
    const info = await Purchases.getCustomerInfo();
    applyInfo(info);
    return info;
  }, [applyInfo]);

  const refresh = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await ensureConfigured();
      if (mounted.current) setReady(true);
      // CustomerInfo remains usable even if the product catalog fails to load.
      const results = await Promise.allSettled([refreshInfo(), Purchases.getOfferings()]);
      if (results[1].status === 'fulfilled' && mounted.current) setOffering(results[1].value.current);
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } catch (e) {
      if (mounted.current) setError(purchaseErrorMessage(e));
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [refreshInfo]);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let listening = false;
    const listener = (info: CustomerInfo) => applyInfo(info);
    void ensureConfigured().then(() => {
      if (disposed) return;
      Purchases.addCustomerInfoUpdateListener(listener);
      listening = true;
      void refresh();
    }).catch(e => { if (mounted.current) setError(purchaseErrorMessage(e)); });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => {
      disposed = true;
      mounted.current = false;
      appState.remove();
      if (listening) Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [applyInfo, refresh]);

  const run = useCallback(async (action: () => Promise<CustomerInfo | null>) => {
    if (locked.current) return null;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await ensureConfigured();
      const info = await action();
      if (info) applyInfo(info);
      return info;
    } catch (e) {
      if (!purchaseWasCancelled(e) && mounted.current) setError(purchaseErrorMessage(e));
      return null;
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [applyInfo]);

  const purchase = (pkg: PurchasesPackage) => run(async () => {
    const { customerInfo: info } = await Purchases.purchasePackage(pkg);
    return info;
  });
  const restore = () => run(() => Purchases.restorePurchases());
  const presentPaywall = () => run(async () => {
    const current = (await Purchases.getOfferings()).current;
    if (!current) throw new Error('No plans are available right now. Please try again later.');
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      offering: current,
      displayCloseButton: true,
    });
    if (result === PAYWALL_RESULT.ERROR) throw new Error('The paywall could not complete your request. Please try again.');
    if (result === PAYWALL_RESULT.CANCELLED) {
      await refreshInfo();
      return null;
    }
    // Check the entitlement, rather than treating a successful transaction as Pro access.
    return refreshInfo();
  });
  const presentCustomerCenter = () => run(async () => {
    await RevenueCatUI.presentCustomerCenter({
      callbacks: {
        onRestoreCompleted: ({ customerInfo: info }) => applyInfo(info),
        onRestoreFailed: ({ error: e }) => { if (mounted.current) setError(purchaseErrorMessage(e)); },
      },
    });
    await Purchases.invalidateCustomerInfoCache();
    return refreshInfo();
  });

  return <SubscriptionContext.Provider value={{ customerInfo, offering, isPro: hasPro(customerInfo), ready, busy, error,
    refresh, purchase, restore, presentPaywall, presentCustomerCenter }}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used inside SubscriptionProvider.');
  return value;
}
