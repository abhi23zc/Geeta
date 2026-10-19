import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toneKey } from '../../shared/content';
import { useContent } from '@/state/content-store';
import { getAlarmMusicStatus, type AlarmMusicStatus } from './alarm';

/** Display installed native audio, rather than advertising a not-yet-downloaded publication. */
export function useAlarmMusic(value: string, at = 0) {
  const key = toneKey(value);
  const { snapshot } = useContent();
  const [status, setStatus] = useState<AlarmMusicStatus | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => { void getAlarmMusicStatus(key, at).then(s => { if (active) setStatus(s); }).catch(() => { if (active) setStatus(null); }); };
    refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const timer = setInterval(refresh, 60000);
    return () => { active = false; subscription.remove(); clearInterval(timer); };
  }, [key, at, snapshot.syncing, snapshot.lastSync, snapshot.alarmCycles]);
  const cycle = snapshot.alarmCycles?.find(c => c.key === key);
  const installed = status?.key === key ? status : null;
  return { status: installed, ready: !cycle || cycle.revision === installed?.revision || cycle.revision === installed?.pendingRevision };
}
