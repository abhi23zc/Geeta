import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { useIsFocused, useNavigation } from 'expo-router/react-navigation';
import { TextR } from '@/components/ritual-ui';
import { useLanguage } from '@/i18n/provider';
import { canAskAlarmNotificationPermission, requestAlarmPermission, getAlarmCapabilityStatus, getAlarmPresentationState, isNativeAlarmAvailable, openAlarmReliabilitySettings, scheduleTestAlarm, type AlarmCapabilityStatus, type AlarmReliabilitySetting } from '@/services/alarm';
import { alarmDeviceProfile, alarmGuideManufacturer } from '@/services/alarm-device';
import { OnboardingButton } from './button';
import { PermissionGuide } from './permission-guide';
import { DEVICE_GUIDES } from './guide-data';
import { accessDeadline, permissionPageCanContinue } from './permission-model';
import { coreAlarmReady } from './model';
import { createReliabilityWriter, loadReliability, RELIABILITY_KEY, reliabilitySteps, type ReliabilityRecord, type Review } from './alarm-reliability-model';

/** Shared lifecycle-bound setup controller; review state never controls native alarm playback. */
export function useAlarmReliability(guide?: string, actualGuide = false) {
  const navigation = useNavigation(), focused = useIsFocused();
  const [status, setStatus] = useState<AlarmCapabilityStatus | null>(null);
  const [record, setRecord] = useState<ReliabilityRecord | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [settingsHint, setSettingsHint] = useState<string | null>(null);
  const pendingHint = useRef<string | null>(null);
  const epoch = useRef(0), alive = useRef(true), flight = useRef(false);
  const writer = useRef<ReturnType<typeof createReliabilityWriter> | null>(null);
  const eligible = useCallback(() => alive.current && navigation.isFocused() && AppState.currentState === 'active' && !getAlarmPresentationState().active, [navigation]);
  const refresh = useCallback(async () => {
    if (!eligible() || !isNativeAlarmAvailable || flight.current) return;
    const generation = ++epoch.current;
    setBusy(true);
    try {
      const [next, raw] = await accessDeadline(Promise.all([getAlarmCapabilityStatus(), AsyncStorage.getItem(RELIABILITY_KEY)]));
      if (generation !== epoch.current || !eligible()) return;
      const saved = loadReliability(next, raw, actualGuide ? alarmGuideManufacturer(next) : guide);
      writer.current = createReliabilityWriter(AsyncStorage, saved, value => {
        if (alive.current && generation === epoch.current && eligible()) setRecord(value);
      }, () => generation === epoch.current && eligible());
      setStatus(next); setRecord(saved); setError(null);
      if (pendingHint.current) { setSettingsHint(pendingHint.current); pendingHint.current = null; }
    } catch {
      if (generation === epoch.current && eligible()) { setRecord(null); writer.current = null; setError('Access could not be checked. Please retry.'); }
    } finally { if (alive.current && generation === epoch.current) setBusy(false); }
  }, [eligible, guide, actualGuide]);
  useEffect(() => { alive.current = true; const invalidate = () => { alive.current = false; epoch.current++; }; return invalidate; }, []);
  useEffect(() => {
    epoch.current++; writer.current = null; pendingHint.current = null;
    if (!focused) return;
    const timer = setTimeout(() => { if (alive.current) { setRecord(null); void refresh(); } }, 0);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); else epoch.current++; });
    const invalidate = () => { clearTimeout(timer); listener.remove(); epoch.current++; };
    return invalidate;
  }, [focused, refresh]);
  const perform = async (action: () => Promise<void>, failureMessage = 'Confirmation could not be saved. Try again.') => {
    if (flight.current || !eligible() || !writer.current) return;
    flight.current = true; setBusy(true); setError(null);
    const generation = epoch.current;
    try { await action(); return true; }
    catch { if (generation === epoch.current && eligible()) setError(failureMessage); return false; }
    finally { flight.current = false; if (alive.current) setBusy(false); if (generation !== epoch.current && eligible()) void refresh(); }
  };
  const steps = status ? reliabilitySteps(status, record?.guide ?? guide) : [];
  return { status, record, busy, error, settingsHint, steps, complete: focused && !busy && !!record && !!status && coreAlarmReady(status), refresh, eligible,
    review: (id: string, result: Review) => perform(async () => { await writer.current!(value => ({ ...value, reviews: { ...value.reviews, [id]: result, ...(id === 'popup' ? { lockscreen: result, 'background-popup': result } : {}) } })); }),
    dismiss: () => perform(async () => { await writer.current!(value => ({ ...value, dismissed: true })); }),
    requestTest: () => perform(async () => { await scheduleTestAlarm(); await writer.current!(value => ({ ...value, testRequestedAt: Date.now(), test: undefined })); }, 'Test setup could not be confirmed. Check the alarm notification before retrying.'),
    saveTest: (rang: boolean, lockScreen: boolean) => perform(async () => { await writer.current!(value => ({ ...value, test: { rang, lockScreen } })); }),
    open: async (id: string, reviewOnly = false) => {
      const started = epoch.current;
      const result = await perform(async () => {
      try {
        if (!reviewOnly && id === 'notifications' && (status?.sdkInt ?? 0) >= 33 && await canAskAlarmNotificationPermission()) {
          if (!eligible()) return;
          await requestAlarmPermission();
          return;
        }
        const result = await openAlarmReliabilitySettings((id === 'permanent' ? 'notifications' : id === 'lockscreen' || id === 'background-popup' ? 'popup' : id) as AlarmReliabilitySetting);
        if (!result) throw new Error('Unavailable');
        if (alive.current) pendingHint.current = result.destination === 'Android settings' ? 'Open Settings → Apps → Aarambh, then follow the instructions above.' : result.destination === 'App details' ? 'In app settings, follow the instructions above. Menu names may differ.' : null;
      } catch { if (alive.current) pendingHint.current = 'We could not open Android settings. Please open the app settings manually.'; }
      });
      if (started === epoch.current && eligible()) await refresh();
      return result;
    },
  };
}

export function AlarmReliabilitySetup({ onReady, allowTest = false }: { onReady?: (ready: boolean) => void; allowTest?: boolean }) {
  const { t, text } = useLanguage();
  const [guide, setGuide] = useState<string>();
  const controller = useAlarmReliability(guide);
  const { status, record, steps, busy, complete } = controller;
  const [selected, setSelected] = useState<string | null>(null), [choosingGuide, setChoosingGuide] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null), [testStarted, setTestStarted] = useState(false);
  const [testFlight, setTestFlight] = useState(false), [rang, setRang] = useState<boolean | null>(null);
  const testLock = useRef(false), generation = useRef(0);
  const focused = useIsFocused();
  useEffect(() => { onReady?.(complete); }, [complete, onReady]);
  useEffect(() => {
    generation.current++;
    const listener = AppState.addEventListener('change', () => { generation.current++; });
    const invalidate = () => { listener.remove(); generation.current++; };
    return invalidate;
  }, [focused]);
  const step = (selected ? steps.find(item => item.id === selected) : undefined) ?? (record ? steps.find(item => !visited.includes(item.id)) : undefined);
  if (!isNativeAlarmAvailable) return null;
  return <View style={{ gap: 14, padding: 16 }}>
    <TextR accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700' }}>{t('Review alarm setup')}</TextR>
    {controller.error ? <><TextR accessibilityRole="alert">{text(controller.error)}</TextR><OnboardingButton label={t('Retry')} disabled={busy} onPress={() => { void controller.refresh(); }} /></> : !record ? <TextR accessibilityLiveRegion="polite">{t('Checking access…')}</TextR> : <>
      {step ? <>
        <TextR accessibilityRole="header" style={{ fontSize: 20 }}>{text(step.label)}</TextR>
        <PermissionGuide key={`${record.guide}:${step.id}`} manufacturer={record.guide ?? guide ?? status?.manufacturer ?? ''} setting={step.id} instruction={step.guidance} />
        {step.native && <TextR accessibilityLiveRegion="polite">{t('Needs action')}</TextR>}
        <OnboardingButton secondary label={t('Review settings')} disabled={busy} onPress={() => { void controller.open(step.id); }} />
        <OnboardingButton label={t('Next')} disabled={busy || !status || !permissionPageCanContinue(step, status)} onPress={() => { setVisited(value => [...value, step.id]); setSelected(null); }} />
      </> : <>
        <TextR>{t('Review alarm setup')}</TextR>
        <TextR>{t('Alarm notifications')} · {t(status?.notifications ? 'Verified' : 'Needs action')}</TextR>
        <TextR>{t('Alarms & reminders')} · {t(status && status.sdkInt >= 31 ? status.exactAlarm ? 'Verified' : 'Needs action' : 'Not applicable')}</TextR>
        <TextR>{t('High-priority alarm channel')} · {t(status && status.sdkInt >= 26 ? status.notificationChannelReady ? 'Verified' : 'Needs action' : 'Not applicable')}</TextR>
        {status && status.sdkInt >= 34 && <TextR>{t('Show alarm on lock screen')} · {t(status.fullScreenIntent ? 'Verified' : 'Needs action')}</TextR>}
        {Object.values(record.reviews).includes('unavailable') && <TextR>{t('Some phone settings are unavailable. Lock-screen presentation is unverified; try the test alarm.')}</TextR>}
        {steps.filter(item => !item.native).map(item => <OnboardingButton key={item.id} secondary label={text(item.label)} disabled={busy} onPress={() => setSelected(item.id)} />)}
      </>}
      {status && alarmDeviceProfile(status.manufacturer).id === 'android' && <OnboardingButton secondary label={t('Choose phone guide')} disabled={busy} onPress={() => setChoosingGuide(value => !value)} />}
      {choosingGuide && DEVICE_GUIDES.map(item => <OnboardingButton key={item.id} secondary label={item.name} disabled={busy} onPress={() => { onReady?.(false); setGuide(item.aliases[0]); setVisited([]); setSelected(null); setChoosingGuide(false); }} />)}
      {allowTest && status && coreAlarmReady(status) && <>
        <OnboardingButton label={t('Test alarm in 30 seconds')} disabled={busy || testFlight} onPress={() => {
          if (testLock.current || !controller.eligible()) return;
          testLock.current = true; setTestFlight(true); const attempt = generation.current;
          void controller.requestTest().then(saved => { if (saved && attempt === generation.current && controller.eligible()) { setTestStarted(true); setRang(null); setMessage('Test alarm scheduled in 30 seconds. Lock your screen to check presentation. It stops after 30 seconds and keeps your saved alarm.'); } }).catch(() => { if (attempt === generation.current && controller.eligible()) setMessage('Test could not be scheduled.'); }).finally(() => { testLock.current = false; setTestFlight(false); });
        }} />
        {(!record.test && (testStarted || !!record.testRequestedAt)) && <>
          <TextR>{t('After the test: did the alarm ring?')}</TextR>
          <OnboardingButton secondary label={t('Yes, it rang')} disabled={busy} onPress={() => setRang(true)} />
          <OnboardingButton secondary label={t('No, it did not ring')} disabled={busy} onPress={() => setRang(false)} />
          {rang !== null && <>
            <TextR>{t('Did the alarm screen appear while locked?')}</TextR>
            <OnboardingButton secondary label={t('Yes, it appeared')} disabled={busy} onPress={() => { void controller.saveTest(rang, true).then(saved => { if (saved && controller.eligible()) { setTestStarted(false); setRang(null); } }); }} />
            <OnboardingButton secondary label={t('No, it did not appear')} disabled={busy} onPress={() => { void controller.saveTest(rang, false).then(saved => { if (saved && controller.eligible()) { setTestStarted(false); setRang(null); } }); }} />
          </>}
        </>}
        {record.test && <>
          <TextR>{t('Test results are user reported.')}</TextR>
          <TextR>{t(record.test.rang ? 'Yes, it rang' : 'No, it did not ring')}</TextR>
          <TextR>{t(record.test.lockScreen ? 'Yes, it appeared' : 'No, it did not appear')}</TextR>
          {!record.test.rang && <OnboardingButton secondary label={t('Review sound and timing')} disabled={busy} onPress={() => { setMessage('Check alarm volume, chosen sound, notifications, precise alarms and background settings.'); setSelected('battery'); }} />}
          {!record.test.lockScreen && <OnboardingButton secondary label={t('Review lock-screen settings')} disabled={busy} onPress={() => { if (steps.some(item => item.id === 'popup')) setSelected('popup'); else void controller.open('fullscreen'); setMessage('Check full-screen alarm access and your phone’s lock-screen settings.'); }} />}
        </>}
      </>}
    </>}
    {controller.settingsHint && <TextR accessibilityLiveRegion="polite">{text(controller.settingsHint)}</TextR>}
    {message && <TextR accessibilityLiveRegion="polite">{text(message)}</TextR>}
  </View>;
}

export function AlarmReliabilityPrompt({ onPress }: { onPress: () => void }) {
  const controller = useAlarmReliability();
  const { t, text } = useLanguage();
  if (!isNativeAlarmAvailable || !controller.record || controller.record.dismissed || controller.complete) return null;
  return <View style={{ gap: 8, padding: 16 }}>
    <OnboardingButton secondary label={t('Review alarm setup')} onPress={onPress} disabled={controller.busy} />
    <OnboardingButton secondary label={t('Remind me when I open alarm setup')} onPress={() => { void controller.dismiss(); }} disabled={controller.busy} />
    {controller.error && <TextR accessibilityRole="alert">{text(controller.error)}</TextR>}
  </View>;
}
