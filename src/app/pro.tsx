import { useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Header, Screen, TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { getPlans, hasPro } from '@/features/subscriptions/model';
import { isTestStore, isPurchasePreview, PRO_ENTITLEMENT } from '@/features/subscriptions/config';
import { useSubscription } from '@/features/subscriptions/provider';

export default function ProScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevelopmentProScreen />;
}

function DevelopmentProScreen() {
  const subscription = useSubscription();
  const [notice, setNotice] = useState<string | null>(null);
  const entitlement = subscription.customerInfo?.entitlements.active[PRO_ENTITLEMENT];
  const disabled = !subscription.ready || subscription.busy;

  const finish = async (request: () => Promise<import('react-native-purchases').CustomerInfo | null>, restore = false) => {
    setNotice(null);
    const info = await request();
    if (info) setNotice(hasPro(info) ? 'Aarambh Pro is active.' : restore
      ? 'No active Aarambh Pro purchase was found for this account.'
      : 'Aarambh Pro is not active. If your payment is pending, access will update when confirmed.');
  };

  const button = (label: string, action: () => void, inactive = disabled) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactive }} disabled={inactive}
      onPress={action} style={({ pressed }) => [styles.button, (pressed || inactive) && { opacity: 0.5 }]}>
      <TextR style={styles.buttonText}>{label}</TextR>
    </Pressable>
  );

  return <Screen>
    <Header title="Aarambh Pro" eyebrow="Your membership" back showActions={false} />
    <View style={styles.content}>
      <View style={styles.card}>
        <TextR style={styles.title}>{subscription.isPro ? 'Pro is active' : 'Choose your plan'}</TextR>
        <TextR style={styles.body}>{subscription.isPro
          ? entitlement?.expirationDate
            ? `${entitlement.willRenew ? 'Renews' : 'Access until'} ${new Date(entitlement.expirationDate).toLocaleDateString()}`
            : 'Lifetime access · No renewal'
          : 'Monthly, yearly, and lifetime options for Aarambh Pro.'}</TextR>
        {!subscription.customerInfo && <TextR style={styles.body}>Membership status is not available yet. Refresh to check.</TextR>}
      </View>
      {__DEV__ && <TextR style={styles.body}>{isPurchasePreview
        ? 'Open a native development build to test purchases.'
        : isTestStore ? 'Test Store mode · No real charges' : 'Store sandbox testing'}</TextR>}
      {subscription.busy && <ActivityIndicator color={C.primary} accessibilityLabel="Loading membership" />}
      {subscription.error && <TextR accessibilityRole="alert" style={styles.error}>{subscription.error}</TextR>}
      {notice && <TextR accessibilityLiveRegion="polite" style={styles.body}>{notice}</TextR>}
      {!subscription.isPro && <>
        {button('View Pro paywall', () => { void finish(subscription.presentPaywall); })}
        {getPlans(subscription.offering).map(plan => <View key={plan.id} style={styles.card}>
          <TextR style={styles.title}>{plan.title}</TextR>
          <TextR style={styles.body}>{plan.detail}{plan.package ? ` · ${plan.package.product.priceString}` : ' · Currently unavailable'}</TextR>
          {button(`Choose ${plan.title.toLowerCase()}`, () => {
            if (plan.package) void finish(() => subscription.purchase(plan.package!));
          }, disabled || !plan.package)}
        </View>)}
        <TextR style={styles.body}>Monthly and yearly plans renew automatically until cancelled through your store. Lifetime is a single purchase.</TextR>
      </>}
      {button('Restore purchases', () => { void finish(subscription.restore, true); })}
      {subscription.customerInfo && button('Manage purchases', () => { void finish(subscription.presentCustomerCenter); })}
      {button('Refresh membership', () => { setNotice(null); void subscription.refresh(); }, subscription.busy)}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  card: { padding: 20, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.hairline, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: C.ink },
  body: { fontSize: 15, lineHeight: 23, color: C.muted },
  error: { color: '#9D2525', fontSize: 15, lineHeight: 23 },
  button: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  buttonText: { color: C.white, fontWeight: '700', fontSize: 16 },
});
