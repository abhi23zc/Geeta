import { toneLabel } from '../../shared/content';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { configTime, getNativeAlarmConfig, isNativeAlarmAvailable, migrateLegacyAlarm, type AlarmDayId, type NativeAlarmConfig } from '@/services/alarm';
import { useRecoverableStore } from './use-recoverable-store';
import { DEFAULT_ALARM, parseAlarmSettings, salvageAlarmSettings, type AlarmSettings } from './persisted-models';

type RitualState = AlarmSettings & {
  setAlarmTime(value: string): void; setAlarmTone(value: string): void;
  setAlarmDays(value: AlarmDayId[]): void; setAlarmEnabled(value: boolean): void;
  alarmReady: boolean; loading: boolean; loadError: string | null; saveError: boolean; corrupt: boolean;
  retryLoad(): Promise<void>; retrySave(): Promise<void>; recover(): Promise<void>;
  reflection: string; setReflection(value: string): void;
};
const Context = createContext<RitualState | null>(null);
const nativeSettings = (config: NativeAlarmConfig): AlarmSettings => ({ alarmTime: configTime(config), alarmTone: toneLabel(config.tone.key ?? 'gita'), alarmDays: config.weekdays, alarmEnabled: config.enabled });
export function RitualProvider({ children }: PropsWithChildren) {
  const store = useRecoverableStore('morning-ritual:alarm-settings', DEFAULT_ALARM, parseAlarmSettings, salvageAlarmSettings);
  const { ready: mirrorReady, data: mirrorData, update: updateMirror } = store;
  const [settings, setSettings] = useState(DEFAULT_ALARM);
  const [nativeLoaded, setNativeLoaded] = useState(!isNativeAlarmAvailable);
  const [nativeReady, setNativeReady] = useState(!isNativeAlarmAvailable);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const native = useRef<NativeAlarmConfig | null>(null);
  const mounted = useRef(true);
  const loadFlight = useRef<Promise<boolean> | null>(null);
  const loadNative = useCallback(() => {
    if (loadFlight.current) return loadFlight.current;
    loadFlight.current = (async () => {
      if (!isNativeAlarmAvailable) return true;
      try {
        const config = await getNativeAlarmConfig();
        if (!mounted.current) return false;
        native.current = config;
        setNativeLoaded(true);
        if (config) { setSettings(nativeSettings(config)); setNativeReady(true); }
        else setNativeReady(false);
        setNativeError(null);
        return true;
      } catch { if (mounted.current) setNativeError('Alarm settings could not be loaded. Please retry.'); return false; }
    })().finally(() => { loadFlight.current = null; });
    return loadFlight.current;
  }, []);
  useEffect(() => { mounted.current = true; void loadNative(); return () => { mounted.current = false; }; }, [loadNative]);
  const migrationFlight = useRef(false);
  const hydrated = useRef(false);
  useEffect(() => {
    if (!mirrorReady || hydrated.current || nativeError || migrationFlight.current) return;
    if (isNativeAlarmAvailable && !nativeLoaded) return;
    migrationFlight.current = true;
    void (async () => {
      try {
        const config = isNativeAlarmAvailable ? await migrateLegacyAlarm(mirrorData) : null;
        if (!mounted.current) return false;
        native.current = config;
        const next = config ? nativeSettings(config) : mirrorData;
        setSettings(next);
        updateMirror(() => next);
        hydrated.current = true;
        setNativeReady(true);
      } catch { if (mounted.current) setNativeError('Alarm settings could not be loaded. Please retry.'); }
      finally { migrationFlight.current = false; }
    })();
  }, [mirrorReady, mirrorData, updateMirror, nativeReady, nativeLoaded, nativeError]);
  const change = (patch: Partial<AlarmSettings>) => {
    // Native scheduling callers may still update their UI mirror while damaged JS data awaits recovery.
    setSettings(current => ({ ...current, ...patch }));
    store.update(current => ({ ...current, ...patch }));
  };
  const retryLoad = async () => { await loadNative(); await store.retryLoad(); };
  const recover = async () => {
    // Re-read the authority before recovery; never replace native settings with defaults.
    if (!(await loadNative())) return;
    await store.recover(value => native.current ? nativeSettings(native.current) : value);
  };
  const [reflection, setReflection] = useState('Warm sunlight on my balcony while reciting morning Gayatri mantra; peaceful, unhurried conversation with mother over ginger tea.');
  return <Context.Provider value={{ ...settings,
    setAlarmTime: value => change({ alarmTime: value }), setAlarmTone: value => change({ alarmTone: value }),
    setAlarmDays: value => change({ alarmDays: value }), setAlarmEnabled: value => change({ alarmEnabled: value }),
    alarmReady: isNativeAlarmAvailable ? nativeReady : store.ready,
    loading: store.loading, loadError: nativeError ?? store.loadError, saveError: store.saveError, corrupt: store.corrupt,
    retryLoad, retrySave: store.retrySave, recover, reflection, setReflection,
  }}>{children}</Context.Provider>;
}
export function useRitual() { const value = useContext(Context); if (!value) throw new Error('Missing RitualProvider'); return value; }
