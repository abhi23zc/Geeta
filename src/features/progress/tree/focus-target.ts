import { useEffect, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, type View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
let target: RefObject<View | null> | null = null;
export function useGrowthFocusTarget(ref: RefObject<View | null>) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    target = ref;
    return () => { if (target === ref) target = null; };
  }, [focused, ref]);
}
export function restoreGrowthFocus() {
  if (Platform.OS === 'web') return;
  const handle = target?.current ? findNodeHandle(target.current) : null;
  if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
}
