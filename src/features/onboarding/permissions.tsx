import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { TextR } from '@/components/ritual-ui';
import { useLanguage } from '@/i18n/provider';
import { useRitual } from '@/state/ritual-store';
import { alarmGuideManufacturer } from '@/services/alarm-device';
import { isNativeAlarmAvailable } from '@/services/alarm';
import { useOnboarding } from './provider';
import { useAlarmReliability } from './alarm-reliability';
import { OnboardingButton } from './button';
import { PermissionGuide } from './permission-guide';
import { permissionPages, permissionPageIds, permissionPageReady, permissionPageCanContinue, resolvePermissionPage } from './permission-model';

export function OnboardingPermissions({ onProgress, registerBack, onFinish }: {
  onProgress: (position: number, total: number) => void;
  registerBack: (action: (() => void) | null) => void;
  /** Reuse the walkthrough for help without changing introduction progress or alarms. */
  onFinish?: () => void;
}) {
  const { record, update, busy } = useOnboarding();
  const { t, text } = useLanguage();
  const ritual = useRitual();
  const controller = useAlarmReliability(undefined, true);
  const { status, record: reviews } = controller;
  const [rang, setRang] = useState<boolean | null>(null);
  const [lockScreen, setLockScreen] = useState<boolean | null>(null);
  const [helpPageId, setHelpPageId] = useState<string>();
  const ids = useMemo(() => status ? permissionPageIds(status) : [], [status]);
  const id = resolvePermissionPage(ids, onFinish ? helpPageId : record?.permissionPageId);
  const index = ids.indexOf(id);
  const pages = status ? permissionPages(status) : [];
  const page = pages.find(item => item.id === id);
  const blocked = (!onFinish && busy) || controller.busy;
  const ready = !!page && !!status && !!reviews && permissionPageReady(page, status, reviews);
  const move = useCallback(async (destination: string | undefined) => {
    if ((!onFinish && busy) || controller.busy || !controller.eligible()) return;
    if (onFinish) {
      if (destination) setHelpPageId(destination);
      else onFinish();
      return;
    }
    await update(value => destination ? { ...value, permissionPageId: destination } : { ...value, step: 'practice', permissionPageId: undefined });
  }, [busy, controller, update, onFinish]);
  useEffect(() => {
    if (ids.length) onProgress(index + 1, ids.length);
  }, [index, ids.length, onProgress]);
  useEffect(() => {
    registerBack(() => { void move(ids[index - 1]); });
    return () => registerBack(null);
  }, [registerBack, move, index, ids]);
  const finish = () => {
    if (blocked || !controller.eligible()) return;
    if (onFinish) onFinish();
    else void update(value => ({ ...value, completed: true, replaying: false }));
  };
  return <View style={{ width: '100%', gap: 14 }}>
    {!isNativeAlarmAvailable ? <TextR>{t('Alarm setup is available in the Android app. You can continue with reading and quizzes here.')}</TextR> : <>
      {!status || !reviews ? <><ActivityIndicator /><TextR accessibilityLiveRegion="polite">{t('Checking access…')}</TextR></> : <>
        {page && <View key={id} style={{ gap: 14 }}>
          <TextR serif accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontSize: 24, fontWeight: '800' }}>{text(page.label)}</TextR>
          <PermissionGuide key={`${status.manufacturer}:${id}`} manufacturer={alarmGuideManufacturer(status)} setting={id} instruction={page.guidance} />
          {page.native && <TextR accessibilityLiveRegion="polite">{t(ready ? 'Verified' : 'Needs action')}</TextR>}
          <OnboardingButton secondary={ready || !page.native} label={t('Review settings')} disabled={blocked} onPress={() => { void controller.open(id, ready); }} />
          <OnboardingButton label={t('Next')} disabled={blocked || !permissionPageCanContinue(page, status)} onPress={() => { void move(ids[index + 1]); }} />
        </View>}
        {id === 'test' && <>
          <TextR serif accessibilityRole="header" style={{ fontSize: 24 }}>{t('Recommended alarm test')}</TextR>
          <TextR>{t('Schedule a test, then lock your screen. The test stops after 30 seconds and keeps your saved alarm.')}</TextR>
          <OnboardingButton label={t('Test alarm in 30 seconds')} disabled={blocked} onPress={() => { void controller.requestTest().then(saved => { if (saved && controller.eligible()) { setRang(null); setLockScreen(null); } }); }} />
          {!!reviews.testRequestedAt && <>
            <TextR>{t('After the test: did the alarm ring?')}</TextR>
            <OnboardingButton secondary label={t('Yes')} disabled={blocked} onPress={() => { setRang(true); }} />
            <OnboardingButton secondary label={t('No')} disabled={blocked} onPress={() => { setRang(false); }} />
            <TextR>{t('Did the alarm screen appear while locked?')}</TextR>
            <OnboardingButton secondary label={t('Yes')} disabled={blocked} onPress={() => { setLockScreen(true); }} />
            <OnboardingButton secondary label={t('No')} disabled={blocked} onPress={() => { setLockScreen(false); }} />
            {rang !== null && <TextR>{t(rang ? 'Yes' : 'No')}</TextR>}
            {lockScreen !== null && <TextR>{t(lockScreen ? 'Yes' : 'No')}</TextR>}
            <OnboardingButton label={t('Save test result')} disabled={blocked || rang === null || lockScreen === null} onPress={() => { if (rang !== null && lockScreen !== null) void controller.saveTest(rang, lockScreen); }} />
            {reviews.test && <TextR>{t(reviews.test.rang && reviews.test.lockScreen ? 'Test confirmed' : 'Check full-screen alarm access and your phone’s lock-screen settings.')}</TextR>}
          </>}
          <OnboardingButton label={t('Continue')} disabled={blocked} onPress={finish} />
        </>}
      </>}
      {controller.error && <TextR accessibilityRole="alert">{text(controller.error)}</TextR>}
      {controller.settingsHint && <TextR accessibilityLiveRegion="polite">{text(controller.settingsHint)}</TextR>}
      {controller.error && <OnboardingButton secondary label={t('Retry')} disabled={blocked} onPress={() => { void controller.refresh(); }} />}
    </>}
    {!onFinish && <TextR>{t('You can set up your alarm later. Reading and quizzes will still work.')}</TextR>}
    <OnboardingButton secondary label={t(onFinish ? 'Close' : ritual.alarmEnabled ? 'Keep saved alarm and continue' : 'Set up later')} disabled={blocked} onPress={finish} />
  </View>;
}
