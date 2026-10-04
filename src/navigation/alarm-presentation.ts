import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addAlarmPresentationListener, getAlarmPresentationState } from '@/services/alarm';

export function useAlarmPresentation() {
  const [state, setState] = useState(getAlarmPresentationState);
  useEffect(() => {
    const refresh = () => setState(getAlarmPresentationState());
    const native = addAlarmPresentationListener(setState);
    const foreground = AppState.addEventListener('change', refresh);
    refresh();
    return () => { native?.remove(); foreground.remove(); };
  }, []);
  return state;
}
