import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export function useTreeEnvironment() {
  // Be conservative until the accessibility preference has loaded.
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) { setReduced(value); setReady(true); } }).catch(() => { if (mounted) setReady(true); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  return { reduced, active, motionReady: ready };
}
