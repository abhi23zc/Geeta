import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Vibration, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Vibrate } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { alarmGuideManufacturer } from '@/services/alarm-device';
import { isNativeAlarmAvailable } from '@/services/alarm';
import { useOnboarding } from './provider';
import { useAlarmReliability } from './alarm-reliability';
import { OnboardingButton } from './button';
import { PermissionGuide } from './permission-guide';
import { walkthroughPages, nativePageReady, nextPermissionPage, missingRequiredPage, permissionPageCanContinue, resolvePermissionPage } from './permission-model';

export function OnboardingPermissions({ onProgress, registerBack, onFinish }: {
  onProgress: (position: number, total: number) => void;
  registerBack: (action: (() => void) | null) => void;
  /** Reuse the walkthrough for help without changing introduction progress or alarms. */
  onFinish?: () => void;
}) {
  const { record, update, busy } = useOnboarding();
  const { t, text } = useLanguage();
  const controller = useAlarmReliability(undefined, true);
  const { status, record: reviews } = controller;
  const [helpPageId, setHelpPageId] = useState<string>();
  const [reviewedPages, setReviewedPages] = useState<Record<string, boolean>>({});
  const [vibrated, setVibrated] = useState(false);
  const pages = useMemo(() => status ? walkthroughPages(status) : [], [status]);
  const ids = useMemo(() => pages.map(page => page.id), [pages]);
  const id = resolvePermissionPage(ids, onFinish ? helpPageId : record?.permissionPageId);
  const index = ids.indexOf(id);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const lastAutomaticId = useRef<string | undefined>(undefined);
  const page = pages.find(item => item.id === id);
  const blocked = (!onFinish && busy) || controller.busy;
  const ready = !!page?.required && !!status && !controller.error && nativePageReady(page.id, status);
  const isLastPage = index === ids.length - 1;
  const hasReviewed = !!reviewedPages[id];
  const triggerTestVibration = async () => {
    setVibrated(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Vibration.vibrate(300);
  };
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
    registerBack(() => { setAutoAdvance(false); lastAutomaticId.current = undefined; void move(ids[index - 1]); });
    return () => registerBack(null);
  }, [registerBack, move, index, ids]);
  const finish = () => {
    if (blocked || !controller.eligible()) return;
    if (onFinish) onFinish();
    else void update(value => ({ ...value, completed: true, replaying: false, permissionPageId: undefined }));
  };
  useEffect(() => {
    if (!autoAdvance || blocked || !ready || !status || !controller.eligible() || lastAutomaticId.current === id) return;
    const destination = nextPermissionPage(pages, status, index);
    if (destination) {
      lastAutomaticId.current = id;
      const timer = setTimeout(() => { void move(destination); }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoAdvance, blocked, ready, status, controller, id, pages, index, move]);
  const next = () => {
    if (!page || !status || blocked || (page.required && controller.error) || !permissionPageCanContinue(page, status)) return;
    setAutoAdvance(true); lastAutomaticId.current = undefined;
    const destination = nextPermissionPage(pages, status, index);
    if (destination) void move(destination);
    else if (controller.error) void controller.refresh();
    else {
      const missing = missingRequiredPage(pages, status);
      if (missing) void move(missing); else finish();
    }
  };
  const actionLabel = page?.required && !ready
    ? ({ notifications: 'Enable notifications', exact: 'Allow precise alarms', channel: 'Open alarm settings' } as const)[page.id as 'notifications' | 'exact' | 'channel']
    : 'Review settings';
  return <View style={{ width: '100%', gap: 14 }}>
    {!isNativeAlarmAvailable ? <TextR>{t('Alarm setup is available in the Android app. You can continue with reading and quizzes here.')}</TextR> : <>
      {!status || !reviews ? <>{!controller.error && <><ActivityIndicator /><TextR accessibilityLiveRegion="polite">{t('Checking access…')}</TextR></>}</> : <>
        {page && <View key={id} style={{ gap: 14 }}>
          <TextR serif accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontSize: 24, fontWeight: '800' }}>{text(page.label)}</TextR>
          <TextR accessibilityLiveRegion="polite" style={{ color: ready ? C.greenDark : C.muted }}>{text(page.required ? ready ? 'Ready' : 'Needed for alarms' : 'Optional')}</TextR>
          <PermissionGuide key={`${status.manufacturer}:${id}`} manufacturer={alarmGuideManufacturer(status)} setting={id} instruction={page.guidance} />
          {id === 'vibration' && (
            <Pressable
              accessibilityRole="button"
              disabled={blocked}
              accessibilityState={{ disabled: blocked }}
              onPress={triggerTestVibration}
              style={({ pressed }) => [
                s.testVibrateButton,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                vibrated && s.testVibrateButtonDone,
              ]}
            >
              <Vibrate size={18} color={vibrated ? '#2E7D32' : C.primary} />
              <TextR style={[s.testVibrateText, vibrated && { color: '#2E7D32' }]}>
                {t(vibrated ? 'Vibration tested!' : 'Tap to test vibration')}
              </TextR>
            </Pressable>
          )}
          {id !== 'vibration' && <OnboardingButton
            secondary={hasReviewed || ready || !page.required}
            label={t(actionLabel)}
            disabled={blocked}
            onPress={() => {
              setReviewedPages(prev => ({ ...prev, [id]: true }));
              setAutoAdvance(true); lastAutomaticId.current = undefined;
              void controller.open(id, !page.required || ready);
            }}
          />}
          <OnboardingButton label={t(isLastPage ? 'Continue' : 'Next')} disabled={blocked || (page.required && !!controller.error) || !permissionPageCanContinue(page, status)} onPress={next} />
        </View>}
      </>}
      {controller.error && <TextR accessibilityRole="alert">{text(controller.error)}</TextR>}
      {controller.settingsHint && <TextR accessibilityLiveRegion="polite">{text(controller.settingsHint)}</TextR>}
      {controller.error && <OnboardingButton secondary label={t('Retry')} disabled={blocked} onPress={() => { void controller.refresh(); }} />}
    </>}
    <OnboardingButton secondary label={t(onFinish ? 'Close' : 'Set up later')} disabled={blocked} onPress={finish} />
  </View>;
}

const s = StyleSheet.create({
  testVibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(224, 86, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224, 86, 36, 0.25)',
  },
  testVibrateButtonDone: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderColor: 'rgba(46, 125, 50, 0.25)',
  },
  testVibrateText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
  },
});
