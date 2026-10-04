import { useEffect, type PropsWithChildren } from 'react';
import { AppState, View } from 'react-native';
import { useNavigation, usePreventRemove, useRoute } from 'expo-router/react-navigation';
import { addAlarmStoppedListener, addAlarmTriggeredListener, getAlarmPlaybackState, endAlarmRitual, getAlarmPresentationState, notifyRitualScreenReady, requestRitualUnlock } from '@/services/alarm';
import { createAlarmNavigation } from './alarm-navigation';
import { replaceAppRoute } from './route-actions';
import { useAlarmPresentation } from './alarm-presentation';
import { canEndRitualOnExit, isRitualRoute, ritualRemovalAllowed, ritualRoutes } from './alarm-presentation-policy';

/** Mounted inside a stack screen, never above the root navigator. */
export function AlarmNavigationGuard({ children }: PropsWithChildren) {
  const navigation = useNavigation();
  const route = useRoute();
  const presentation = useAlarmPresentation();
  const current = getAlarmPresentationState();
  const expected = current.stage ? ritualRoutes[current.stage] : null;
  const restoring = current.active && (current.loading || current.stage === 'wake') && route.name !== expected;
  const blocked = restoring || (current.active && current.locked && !isRitualRoute(route.name));
  usePreventRemove(presentation.active && presentation.locked, ({ data }) => {
    if (ritualRemovalAllowed(data.action, navigation.getState())) {
      navigation.dispatch(data.action);
    } else if (getAlarmPresentationState().stage !== 'wake') {
      void requestRitualUnlock().then(async allowed => {
        if (allowed && navigation.isFocused()) {
          await endAlarmRitual();
          navigation.dispatch(data.action);
        }
      }).catch(error => console.error('Could not leave the alarm ritual', error));
    }
  });
  useEffect(() => {
    if (blocked && expected && navigation.isFocused()) {
      replaceAppRoute(navigation, `/${expected}`, { entry: 'alarm' });
    }
  }, [blocked, expected, navigation, presentation.active, presentation.loading]);
  useEffect(() => {
    const clearAfterExit = () => {
      const state = getAlarmPresentationState();
      if (!blocked && canEndRitualOnExit(state, route.name, navigation.isFocused())) {
        void endAlarmRitual();
      }
    };
    clearAfterExit();
    return navigation.addListener('focus', clearAfterExit);
  }, [blocked, navigation, presentation.active, presentation.locked, route.name]);
  useEffect(() => {
    if (blocked || !presentation.active || !isRitualRoute(route.name)) return;
    const frame = requestAnimationFrame(() => {
      if (navigation.isFocused()) void notifyRitualScreenReady(route.name).catch(error => console.error('Could not show the ritual screen', error));
    });
    return () => cancelAnimationFrame(frame);
  }, [blocked, navigation, presentation.active, presentation.loading, route.name]);
  useEffect(() => {
    const guard = createAlarmNavigation(
      getAlarmPlaybackState,
      () => {
        const state = navigation.getState();
        return AppState.currentState === 'active' && navigation.isFocused() &&
          state?.routes[state.index ?? 0]?.name !== 'alarm/wake';
      },
      () => { replaceAppRoute(navigation, '/alarm/wake'); },
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
  return <View key={blocked ? 'blocked' : route.key} style={{ flex: 1 }} onLayout={() => {
    if (blocked || !navigation.isFocused()) return;
    if (isRitualRoute(route.name)) {
      void notifyRitualScreenReady(route.name).catch(error => console.error('Could not show the ritual screen', error));
    } else if (canEndRitualOnExit(getAlarmPresentationState(), route.name, navigation.isFocused())) {
      void endAlarmRitual();
    }
  }}>{blocked ? null : children}</View>;
}
