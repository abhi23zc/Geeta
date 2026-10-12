import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { createMotionEnvironmentStore, decorativeMotionAllowed } from './motion-policy';

const store = createMotionEnvironmentStore({
  active: () => AppState.currentState === 'active',
  reduced: () => AccessibilityInfo.isReduceMotionEnabled(),
  listenActive: publish => {
    const subscription = AppState.addEventListener('change', state => publish(state === 'active'));
    return () => subscription.remove();
  },
  listenReduced: publish => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
    return () => subscription.remove();
  },
});
export function useMotionEnvironment() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
export function useDecorativeMotion() {
  return decorativeMotionAllowed(useIsFocused(), useMotionEnvironment());
}
