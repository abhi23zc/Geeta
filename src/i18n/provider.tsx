import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { getAlarmStartupState, setNativeAppLanguage } from '@/services/alarm';
import { createLanguageWriter, hydrateLanguagePreference, LANGUAGE_STORAGE_KEY, type AppLanguage } from './model';
import { setTranslationLanguage, translate, translateText, type TranslationKey } from './translations';

import { alarmLanguageBootstrap } from './alarm-bootstrap';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';

type LanguageContext = {
  language: AppLanguage; busy: boolean; error: string | null;
  nativeSyncError: boolean;
  setLanguage: (language: AppLanguage) => Promise<boolean>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  text: (value: string | undefined) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
};
const Context = createContext<LanguageContext | null>(null);
export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [bootstrap] = useState(() => alarmLanguageBootstrap(getAlarmStartupState()));
  const presentation = useAlarmPresentation();
  const [language, update] = useState<AppLanguage>(() => {
    const initial = bootstrap.immediate ? bootstrap.language : 'en';
    setTranslationLanguage(initial);
    return initial;
  }), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [nativeSyncError, setNativeSyncError] = useState(false);
  const languageRef = useRef<AppLanguage>(language), pending = useRef(0), alive = useRef(true);
  const hydrated = useRef(false), nativeTail = useRef<Promise<void>>(Promise.resolve());
  const syncNative = useCallback((next: AppLanguage) => {
    nativeTail.current = nativeTail.current.then(() => setNativeAppLanguage(next)).then(() => {
      if (alive.current) setNativeSyncError(false);
    }).catch(() => { if (alive.current) setNativeSyncError(true); });
  }, []);
  const publish = useCallback((next: AppLanguage) => {
    languageRef.current = next; setTranslationLanguage(next);
    if (alive.current) update(next);
    syncNative(next);
  }, [syncNative]);
  const writer = useRef<ReturnType<typeof createLanguageWriter> | null>(null);
  const hydrate = useCallback(async () => {
    try {
      const next = await hydrateLanguagePreference(AsyncStorage, bootstrap.immediate ? bootstrap.language : undefined);
      if (alive.current) { hydrated.current = true; publish(next); setError(null); setReady(true); }
    } catch { if (alive.current) setError('Language preference could not be loaded. Please retry.'); }
  }, [bootstrap, publish]);
  useEffect(() => {
    alive.current = true;
    writer.current = createLanguageWriter(next => AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(next)), publish, () => hydrated.current);
    const timer = setTimeout(() => { void hydrate(); }, 0);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && hydrated.current) syncNative(languageRef.current);
    });
    return () => { alive.current = false; clearTimeout(timer); listener.remove(); };
  }, [hydrate, publish, syncNative]);
  const setLanguage = useCallback(async (next: AppLanguage) => {
    if (!hydrated.current) return false;
    pending.current++; setBusy(true);
    try { await writer.current!(next); if (alive.current) setError(null); return true; }
    catch { if (alive.current) setError('Language could not be saved. Please try again.'); return false; }
    finally { pending.current--; if (alive.current) setBusy(pending.current > 0); }
  }, []);
  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => translate(key, params, language), [language]);
  const text = useCallback((value: string | undefined) => translateText(value, language), [language]);
  const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN-u-nu-latn' : 'en-IN', options).format(date), [language]);
  const formatNumber = useCallback((value: number) => new Intl.NumberFormat(language === 'hi' ? 'hi-IN-u-nu-latn' : 'en-IN').format(value), [language]);
  if (!ready && !bootstrap.immediate) return <View style={{ flex: 1, backgroundColor: '#FFF8F0', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
    {error ? <><Text accessibilityRole="alert">{error}</Text><Pressable accessibilityRole="button" onPress={() => { setError(null); void hydrate(); }} style={{ minHeight: 48, padding: 16 }}><Text>Retry / फिर प्रयास करें / Phir try karein</Text></Pressable></> : <ActivityIndicator accessibilityLabel="Loading language / भाषा लोड हो रही है" />}
  </View>;
  return <Context.Provider value={{ language, setLanguage, busy: busy || !ready, error, nativeSyncError, t, text, formatDate, formatNumber }}>{children}
    {bootstrap.immediate && !presentation.active && !ready && error && <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24, padding: 16, backgroundColor: '#FFF8F0' }}>
      <Text accessibilityRole="alert">{error}</Text>
      <Pressable accessibilityRole="button" onPress={() => { setError(null); void hydrate(); }} style={{ minHeight: 48, padding: 16 }}><Text>Retry / फिर प्रयास करें / Phir try karein</Text></Pressable>
    </View>}</Context.Provider>;
}
export function useLanguage() {
  const value = useContext(Context);
  if (!value) throw new Error('LanguageProvider missing');
  return value;
}
