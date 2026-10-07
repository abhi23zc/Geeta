import { useEffect, useId, useRef, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { useNavigation, usePreventRemoveContext, useRoute } from 'expo-router/react-navigation';
import { addAlarmStoppedListener, addAlarmTriggeredListener, getAlarmPlaybackState, endAlarmRitual, getAlarmPresentationState, acknowledgeRitualScreen, recordAlarmNavigationState, requestRitualUnlock } from '@/services/alarm';
import { createAlarmNavigation } from './alarm-navigation';
import { replaceAppRoute } from './route-actions';
import { useAlarmPresentation } from './alarm-presentation';
import { canEndRitualOnExit, ritualRemovalAllowed, ritualRoutes, ritualRouteTarget } from './alarm-presentation-policy';

import { useLanguage } from '@/i18n/provider';
import { createRitualRouteRestoration } from './ritual-route-restoration';
import { createRouteRemovalProtection } from './route-removal-protection';
import { createRitualReadiness, identityKey } from './ritual-readiness';

// Build-time validation seam; production builds leave this unset (zero delay).
// One monotonic deadline per JS runtime, with no polling or route changes.
const controlledReadyAt = performance.now() + Math.min(20_000, Math.max(0, Number(process.env.EXPO_PUBLIC_ALARM_STARTUP_DELAY_MS) || 0));

/** Mounted inside a stack screen, never above the root navigator. */
export function AlarmNavigationGuard({ children }: PropsWithChildren) {
  const navigation = useNavigation();
  const route = useRoute();
  const presentation = useAlarmPresentation();
  const { text } = useLanguage();
  const restoration = useRef<ReturnType<typeof createRitualRouteRestoration> | null>(null);
  const current = getAlarmPresentationState();
  const expected = current.stage ? ritualRoutes[current.stage] : null;
  const blocked = ritualRouteTarget(current, route.name) !== null;
  // screenLayout can briefly retain a descriptor whose route was already replaced.
  // Register against live state in the effect and on state events, including native gesture protection.
  const removalId = useId();
  const { setPreventRemove } = usePreventRemoveContext();
  useEffect(() => {
    const protection = createRouteRemovalProtection({
      routeKey: route.key,
      getState: navigation.getState,
      shouldPrevent: () => {
        const latest = getAlarmPresentationState();
        return latest.active && latest.locked;
      },
      register: prevent => setPreventRemove(removalId, route.key, prevent),
    });
    const state = navigation.addListener('state', () => protection.refresh());
    const beforeRemove = navigation.addListener('beforeRemove', event => protection.beforeRemove(event, () => {
      const data = event.data;
      if (!getAlarmPresentationState().active || ritualRemovalAllowed(data.action, navigation.getState())) {
        navigation.dispatch(data.action);
      } else if (getAlarmPresentationState().stage !== 'wake') {
        const leavingSession = getAlarmPresentationState().sessionId;
        void requestRitualUnlock().then(async allowed => {
          if (allowed && navigation.isFocused() && getAlarmPresentationState().sessionId === leavingSession && getAlarmPresentationState().stage !== 'wake') {
            await endAlarmRitual(leavingSession ?? undefined);
            if (!getAlarmPresentationState().active && navigation.isFocused()) navigation.dispatch(data.action);
          }
        }).catch(error => console.error('Could not leave the alarm ritual', error));
      }
    }));
    protection.refresh();
    return () => { state(); beforeRemove(); protection.dispose(); };
  }, [navigation, presentation.active, presentation.locked, removalId, route.key, setPreventRemove]);
  useEffect(() => {
    const controller = createRitualRouteRestoration({
      frame: requestAnimationFrame, cancelFrame: cancelAnimationFrame,
      target: () => ritualRouteTarget(getAlarmPresentationState(), route.name),
      canNavigate: () => AppState.currentState === 'active' && navigation.isFocused() &&
        !!navigation.getState()?.routes.some(candidate => candidate.key === route.key),
      replace: target => replaceAppRoute(navigation, target === 'index' ? '/' : `/${target}`, target === 'index' ? undefined : { entry: 'alarm' }),
    });
    restoration.current = controller;
    let lastDiagnostic = '', diagnosticCount = 0;
    const refresh = () => {
      const state = navigation.getState();
      const top = state?.routes[state.index ?? 0]?.name ?? 'none';
      const focused = navigation.isFocused();
      const owned = !!state?.routes.some(candidate => candidate.key === route.key);
      const foreground = AppState.currentState === 'active';
      const diagnostic = `${top}:${focused}:${owned}:${foreground}`;
      if (getAlarmPresentationState().active && lastDiagnostic !== diagnostic && diagnosticCount++ < 12) {
        lastDiagnostic = diagnostic;
        void recordAlarmNavigationState(route.name, top, focused, owned, foreground).catch(() => undefined);
      }
      controller.refresh();
    };
    const focus = navigation.addListener('focus', refresh);
    const state = navigation.addListener('state', refresh);
    const blur = navigation.addListener('blur', () => controller.invalidate());
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') refresh(); else controller.invalidate();
    });
    refresh();
    return () => { controller.dispose(); restoration.current = null; focus(); state(); blur(); foreground.remove(); };
  }, [current.active, current.loading, current.locked, current.stage, current.sessionId, current.hostGeneration, navigation, route.key, route.name]);
  useEffect(() => {
    const clearAfterExit = () => {
      const state = getAlarmPresentationState();
      if (!blocked && canEndRitualOnExit(state, route.name, navigation.isFocused())) {
        void endAlarmRitual(state.sessionId ?? undefined);
      }
    };
    clearAfterExit();
    return navigation.addListener('focus', clearAfterExit);
  }, [blocked, navigation, presentation.active, presentation.locked, route.name]);
  const measurement = useRef<{ key: string; width: number; height: number } | null>(null);
  const readiness = useRef<ReturnType<typeof createRitualReadiness> | null>(null);
  const contentKey = blocked ? 'blocked' : `${route.key}:${current.sessionId ?? 'manual'}`;
  useEffect(() => {
    if (blocked || !current.active || !current.sessionId || !current.stage || expected !== route.name) return;
    const identity = { sessionId: current.sessionId, stage: current.stage, hostGeneration: current.hostGeneration, coverGeneration: current.coverGeneration };
    const delay = Math.max(0, controlledReadyAt - performance.now());
    let delayElapsed = delay === 0;
    const handshake = createRitualReadiness({
      identity,
      eligible: () => {
        const latest = getAlarmPresentationState();
        return delayElapsed && AppState.currentState === 'active' && navigation.isFocused() && latest.active &&
          latest.sessionId != null && latest.stage != null && ritualRoutes[latest.stage] === route.name &&
          identityKey({ sessionId: latest.sessionId, stage: latest.stage, hostGeneration: latest.hostGeneration, coverGeneration: latest.coverGeneration }) === identityKey(identity);
      },
      acknowledge: acknowledgeRitualScreen,
      frame: requestAnimationFrame, cancelFrame: cancelAnimationFrame,
      onError: error => console.error('Could not show the ritual screen', error),
    });
    const delayTimer = delay > 0 ? setTimeout(() => { delayElapsed = true; handshake.recheck(); }, delay) : null;
    readiness.current = handshake;
    const measured = measurement.current;
    if (measured?.key === contentKey) handshake.layout(measured.width, measured.height);
    const focus = navigation.addListener('focus', handshake.recheck);
    const blur = navigation.addListener('blur', handshake.cancel);
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') handshake.recheck(); else handshake.cancel();
    });
    const stopped = addAlarmStoppedListener(event => {
      handshake.cancel();
      // Hold dismissal stops playback while the same ritual continues.
      if (event.reason === 'start-my-day') handshake.recheck();
    });
    return () => { if (delayTimer !== null) clearTimeout(delayTimer); handshake.dispose(); readiness.current = null; focus(); blur(); foreground.remove(); stopped?.remove(); };
  }, [blocked, contentKey, current.active, current.sessionId, current.stage, current.hostGeneration, current.coverGeneration, expected, navigation, route.name]);
  useEffect(() => {
    const guard = createAlarmNavigation(
      getAlarmPlaybackState,
      () => {
        const state = navigation.getState();
        return AppState.currentState === 'active' && navigation.isFocused() &&
          state?.routes[state.index ?? 0]?.name !== 'alarm/wake';
      },
      () => { replaceAppRoute(navigation, '/alarm/wake', { entry: 'alarm' }); },
      error => console.error('Could not restore the alarm screen', error),
    );
    const refresh = () => { void guard.refresh(); };
    refresh();
    const focus = navigation.addListener('focus', refresh);
    const blur = navigation.addListener('blur', () => guard.invalidate());
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') refresh(); else guard.invalidate();
    });
    const triggered = addAlarmTriggeredListener(refresh);
    const stopped = addAlarmStoppedListener(() => guard.invalidate());
    return () => {
      guard.dispose();
      focus();
      blur();
      foreground.remove();
      triggered?.remove();
      stopped?.remove();
    };
  }, [navigation]);
  return <View key={contentKey} style={{ flex: 1 }} onLayout={({ nativeEvent: { layout } }) => {
    if (blocked) return;
    measurement.current = { key: contentKey, width: layout.width, height: layout.height };
    readiness.current?.layout(layout.width, layout.height);
    if (canEndRitualOnExit(getAlarmPresentationState(), route.name, navigation.isFocused())) {
      void endAlarmRitual(getAlarmPresentationState().sessionId ?? undefined);
    }
  }}>{blocked ? <View style={{ flex: 1, backgroundColor: '#FFF8F0', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
    <ActivityIndicator accessibilityLabel={text('Preparing your ritual')} />
    <Text>{text('Preparing your ritual')}</Text>
    <Pressable accessibilityRole="button" onPress={() => restoration.current?.retry()} style={{ minHeight: 48, padding: 16 }}>
      <Text>{text('Try again')}</Text>
    </Pressable>
  </View> : children}</View>;
}
