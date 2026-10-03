import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import * as Network from 'expo-network';
import { getDailyGitaVerse, getGitaVerse, type GitaVerse } from '@/data/gita-verses';
import { useLocalDateKey } from '@/hooks/use-local-date-key';
import { readContent, subscribeContent, syncContent, saveTeaching, type CacheSnapshot } from '@/services/content-cache';
import { registerContentBackground } from '@/services/content-background';
import { useGitaProgress } from './gita-store';

const empty: CacheSnapshot = { days: {}, saved: [], alarms: [], wifiOnly: false, bytes: 0, lastSync: 0, error: null, syncing: false, progress: '', configured: !!process.env.EXPO_PUBLIC_CONTENT_API_URL };
const Context = createContext<{ snapshot: CacheSnapshot; ready: boolean; practice: GitaVerse; fallback: boolean; refresh: () => Promise<void> } | null>(null);
export function ContentProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(empty), [ready, setReady] = useState(false);
  const today = useLocalDateKey(), { bookmarks, ready: progressReady } = useGitaProgress();
  const loadEpoch = useRef(0);
  const load = useCallback(async () => {
    if (Platform.OS === 'ios') { setReady(true); return; }
    const epoch = ++loadEpoch.current;
    try { const value = await readContent(); if (epoch === loadEpoch.current) setSnapshot(value); } catch (error) { if (epoch === loadEpoch.current) setSnapshot(s => ({ ...s, error: String(error) })); }
    finally { if (epoch === loadEpoch.current) setReady(true); }
  }, []);
  useEffect(() => {
    let alive = true;
    const update = () => { if (alive) void load(); };
    const unsubscribe = subscribeContent(update);
    update();
    void registerContentBackground().catch(() => undefined);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') { update(); void syncContent().catch(() => undefined); } });
    const network = Network.addNetworkStateListener(state => { if (state.isConnected) void syncContent().catch(() => undefined); });
    return () => { alive = false; unsubscribe(); foreground.remove(); network.remove(); };
  }, [load]);
  useEffect(() => { void syncContent().catch(() => undefined); }, [today]);
  const practice = snapshot.days[today] ?? Object.entries(snapshot.days).filter(([date]) => date < today).sort(([a], [b]) => b.localeCompare(a)).find(([, v]) => v.narration)?.[1] ?? getDailyGitaVerse();
  useEffect(() => {
    if (!progressReady || Platform.OS !== 'android') return;
    for (const id of bookmarks) {
      if (snapshot.saved.some(v => v.id === id)) continue;
      const verse = Object.values(snapshot.days).find(v => v.id === id) ?? getGitaVerse(id);
      if (verse) void saveTeaching(verse).catch(() => undefined);
    }
  }, [bookmarks, progressReady, snapshot.days, snapshot.saved]);
  return <Context.Provider value={{ snapshot, ready, practice, fallback: !snapshot.days[today], refresh: () => syncContent(true) }}>{children}</Context.Provider>;
}
export function useContent() { const value = useContext(Context); if (!value) throw new Error('Missing ContentProvider'); return value; }
