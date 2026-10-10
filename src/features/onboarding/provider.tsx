import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { getAlarmStartupState, getNativeAlarmConfig } from '@/services/alarm';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { bootstrapOnboarding, createOnboardingWriter, ONBOARDING_KEY, OnboardingRecordError, type OnboardingRecord } from './model';
import { confirmAction } from '@/features/quiz/actions';
import { releaseStartupSplash } from './startup-splash';

type OnboardingContext = {
  record: OnboardingRecord | null; error: string | null; busy: boolean; corrupt: boolean;
  update: (change: (record: OnboardingRecord) => OnboardingRecord) => Promise<boolean>;
  retry: () => void; recover: () => Promise<void>; replay: () => Promise<boolean>;
  defer: (route: string, params?: Record<string, unknown>) => void;
  takeDeferred: () => { route: string; params?: Record<string, unknown> } | null;
};
const Context = createContext<OnboardingContext | null>(null);
export function StartupRecovery({ error, retry, recover }: { error: string | null; retry: () => void; recover?: () => void }) {
  return (
    <View onLayout={error ? releaseStartupSplash : undefined} style={{ flex: 1, backgroundColor: '#FFF9F5', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }}>
      <Image source={require('@/assets/images/aru-splash.png')} style={{ width: 170, height: 170 }} resizeMode="contain" accessible={false} />
      {error ? (
        <View style={{ width: '100%', maxWidth: 400, gap: 16, alignItems: 'center' }}>
          <View style={{ padding: 18, borderRadius: 20, backgroundColor: 'rgba(255, 248, 242, 0.95)', borderWidth: 1.5, borderColor: '#F8B4B4', width: '100%' }}>
            <Text accessibilityRole="alert" style={{ textAlign: 'center', color: '#2C221A', fontSize: 15, lineHeight: 24, fontWeight: '600' }}>
              Introduction could not be loaded. Please retry.{'\n'}
              परिचय लोड नहीं हुआ। फिर प्रयास करें।{'\n'}
              Introduction load nahi hua. Phir try karein.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [{ minHeight: 52, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#E56B27', borderRadius: 999, width: '100%', alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.88 }]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Retry / फिर प्रयास करें / Phir try karein</Text>
          </Pressable>
          {recover && (
            <Pressable
              accessibilityRole="button"
              onPress={recover}
              style={({ pressed }) => [{ minHeight: 52, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: 'rgba(254, 236, 220, 0.95)', borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.95)', width: '100%', alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.88 }]}
            >
              <Text style={{ color: '#A8470C', fontSize: 15, fontWeight: '700' }}>Restart introduction / परिचय फिर शुरू करें / Introduction phir shuru karein</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ActivityIndicator size="large" color="#E56B27" accessibilityLabel="Loading / लोड हो रहा है / Load ho raha hai" />
      )}
    </View>
  );
}

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [alarmEntry] = useState(() => getAlarmStartupState().active);
  const alarm = useAlarmPresentation();
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [corrupt, setCorrupt] = useState(false);
  const alive = useRef(true), flight = useRef<Promise<void> | null>(null);
  const writer = useRef<ReturnType<typeof createOnboardingWriter> | null>(null);
  const deferred = useRef<ReturnType<OnboardingContext['takeDeferred']>>(null);
  const defer = useCallback((route: string, params?: Record<string, unknown>) => { if (!deferred.current) deferred.current = { route, params }; }, []);
  const takeDeferred = useCallback(() => { const value = deferred.current; deferred.current = null; return value; }, []);
  const operation = useRef(false);
  const install = useCallback((value: OnboardingRecord) => {
    if (!alive.current) return;
    setRecord(value); setError(null); setCorrupt(false);
    writer.current = createOnboardingWriter(AsyncStorage, value, next => { if (alive.current) setRecord(next); });
  }, []);
  const retry = useCallback(() => {
    if (flight.current) return;
    setError(null);
    const timeout = setTimeout(() => { if (alive.current) setError('Introduction could not be loaded. Please retry.'); }, 5000);
    flight.current = bootstrapOnboarding(AsyncStorage, getNativeAlarmConfig, alarmEntry).then(install).catch(cause => {
      if (alive.current) { setError('Introduction could not be loaded. Please retry.'); setCorrupt(cause instanceof OnboardingRecordError); }
    }).finally(() => { clearTimeout(timeout); flight.current = null; });
  }, [alarmEntry, install]);
  useEffect(() => { alive.current = true; retry(); return () => { alive.current = false; }; }, [retry]);
  const update = useCallback(async (change: (current: OnboardingRecord) => OnboardingRecord) => {
    if (!writer.current || operation.current) return false;
    operation.current = true; setBusy(true);
    try { await writer.current(change); if (alive.current) setError(null); return true; }
    catch { if (alive.current) setError('Introduction could not be saved. Please retry.'); return false; }
    finally { operation.current = false; if (alive.current) setBusy(false); }
  }, []);
  const replay = useCallback(() => update(value => ({ ...value, step: 'welcome', permissionPageId: undefined, replaying: true })), [update]);
  const recover = useCallback(async () => {
    if (operation.current || flight.current) return;
    operation.current = true; setBusy(true);
    try {
      const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (raw !== null) await AsyncStorage.setItem(`${ONBOARDING_KEY}:backup:${Date.now()}`, raw);
      const value: OnboardingRecord = { version: 1, step: 'welcome', completed: false, replaying: false };
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(value));
      install(value);
    } catch { if (alive.current) setError('Introduction could not be saved. Please retry.'); }
    finally { operation.current = false; if (alive.current) setBusy(false); }
  }, [install]);
  return <Context.Provider value={{ record, error, busy, corrupt, update, retry, recover, replay, defer, takeDeferred }}>
    {record || alarm.active || alarmEntry ? children : <StartupRecovery error={error} retry={retry} recover={corrupt && !busy ? () => confirmAction(
      'Restart introduction / परिचय फिर शुरू करें / Introduction phir shuru karein',
      'Only introduction setup will restart. Its original record will be backed up. App progress and alarm settings will be preserved.\nकेवल परिचय फिर शुरू होगा। पुराने रिकॉर्ड की सुरक्षित प्रति बनेगी। प्रगति और अलार्म सुरक्षित रहेंगे।\nSirf introduction phir shuru hoga. Purane record ka backup banega. Progress aur alarm safe rahenge.',
      'Restart / फिर शुरू करें / Phir shuru karein', () => { void recover(); },
    ) : undefined} />}
  </Context.Provider>;
}
export function useOnboarding() {
  const value = useContext(Context);
  if (!value) throw new Error('OnboardingProvider missing');
  return value;
}
