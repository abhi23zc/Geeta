import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, View } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from 'expo-router/react-navigation';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { replaceAppRoute } from '@/navigation/route-actions';
import { introductionRoute } from './model';
import { StartupRecovery, useOnboarding } from './provider';
import { releaseStartupSplash } from './startup-splash';
import { useLanguage } from '@/i18n/provider';
import { confirmAction } from '@/features/quiz/actions';
import { createRitualRouteRestoration } from '@/navigation/ritual-route-restoration';
import { getAlarmPresentationState } from '@/services/alarm';

const deferrable = new Set(['today', 'progress', 'quiz', 'saved', 'downloads', 'language']);
export function OnboardingGate({ children }: PropsWithChildren) {
  const navigation = useNavigation(), route = useRoute();
  const focused = useIsFocused();
  const alarm = useAlarmPresentation();
  const { record, error, retry, defer, corrupt, recover } = useOnboarding();
  const { t } = useLanguage();
  const restoration = useRef<ReturnType<typeof createRitualRouteRestoration> | null>(null);
  const [transitionError, setTransitionError] = useState(false);
  const entry = (route.params as { entry?: string } | undefined)?.entry;
  const target = record ? introductionRoute(record, route.name, alarm.active || alarm.loading, entry) : null;
  const retryTransition = useCallback(() => restoration.current?.retry(), []);
  useEffect(() => {
    if (!target) return;
    // A child effect can run before the root navigator registers its action
    // handler. Wait for a frame and recheck live focus/ownership before dispatch.
    const controller = createRitualRouteRestoration({
      frame: requestAnimationFrame, cancelFrame: cancelAnimationFrame,
      target: () => {
        const latest = getAlarmPresentationState();
        return latest.active || latest.loading ? null : target;
      },
      canNavigate: () => AppState.currentState === 'active' && navigation.isFocused() &&
        !!navigation.getState()?.routes.some(candidate => candidate.key === route.key),
      replace: destination => {
        if (deferrable.has(route.name)) defer(`/${route.name}`, route.params as Record<string, unknown> | undefined);
        return replaceAppRoute(navigation, `/${destination}`);
      },
    });
    restoration.current = controller;
    const timeout = setTimeout(() => setTransitionError(true), 5000);
    const onFocus = navigation.addListener('focus', controller.refresh);
    const onState = navigation.addListener('state', controller.refresh);
    const onBlur = navigation.addListener('blur', controller.invalidate);
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') controller.retry(); else controller.invalidate();
    });
    controller.refresh();
    return () => {
      clearTimeout(timeout); controller.dispose(); restoration.current = null;
      onFocus(); onState(); onBlur(); foreground.remove();
    };
  }, [target, focused, navigation, route.key, route.name, route.params, defer]);
  if (!record && !alarm.active) return <StartupRecovery error={error} retry={retry} recover={corrupt ? () => confirmAction(t('Restart introduction'), t('Only introduction setup will restart. Your original introduction record will be backed up; app progress and alarm settings will be preserved.'), t('Restart introduction'), () => { void recover(); }) : undefined} />;
  if (target) return <StartupRecovery error={transitionError ? t('Introduction could not be loaded. Please retry.') : null} retry={retryTransition} />;
  return <View style={{ flex: 1 }} onLayout={releaseStartupSplash}>{children}</View>;
}
