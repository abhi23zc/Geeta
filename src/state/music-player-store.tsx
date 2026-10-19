import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { useLanguage } from '@/i18n/provider';
import { NativeMusicAdapter } from '@/services/music/native-adapter';
import { ExpoMusicAdapter } from '@/services/music/expo-adapter';
import { activateTrack, transportAvailability, type PlaybackAdapter, type QueueEntry } from '@/services/music/model';
import { hydrateMusicCatalog, localize, musicCatalogSnapshot, refreshMusicCatalog, subscribeMusicCatalog } from '@/services/music/catalog';
import { readMusicRepository, writeMusicRepository, mergeMusicHydration, musicPersistenceError, subscribeMusicPersistence, type MusicRepository } from '@/services/music/repository';
import {unavailableMusicTrack} from '@/data/music-catalog';
import {acquireCurrentMusic,readDownloadedMusic,setMusicDownloadCatalog} from '@/services/music-downloads';
import type { MusicTrack, Playlist } from '@/types/music';
const Context = createContext<{
    sessionReady: boolean;
    activateTrack: (track: MusicTrack, queue?: MusicTrack[], index?: number) => Promise<void>;
    persistenceError:string|null;
    adapter: PlaybackAdapter;
    favorites: Set<string>;
    recentlyPlayed: MusicTrack[];
    isFullPlayerVisible: boolean;
    playDownloadedTrack: (track: MusicTrack) => Promise<void>;
    playTrack: (track: MusicTrack, queue?: MusicTrack[], index?: number) => Promise<void>;
    playPlaylist: (playlist: Playlist, index?: number, shuffle?: boolean) => Promise<void>;
    toggleFavorite: (id: string) => void;
    openFullPlayer: () => void;
    closeFullPlayer: () => void;
} | null>(null);
export function MusicPlayerProvider({ children }: {
    children: ReactNode;
}) {
    const persistenceError=useSyncExternalStore(subscribeMusicPersistence,musicPersistenceError,musicPersistenceError);
    const [catalogReady,setCatalogReady]=useState(false);
    const [sessionReady,setSessionReady]=useState(false);
    const [adapter] = useState<PlaybackAdapter>(() => Platform.OS === 'android' ? new NativeMusicAdapter() : new ExpoMusicAdapter());
    const [favorites, setFavorites] = useState<Set<string>>(new Set()), [recentIds, setRecents] = useState<string[]>([]), [visible, setVisible] = useState(false);
    const repo = useRef<MusicRepository>({ version: 2, favorites: [], recents: [], session: null }), hydrated = useRef(false), touched = useRef(false), pendingFavorites = useRef<string[]>([]);
    const catalog = useSyncExternalStore(subscribeMusicCatalog, musicCatalogSnapshot, musicCatalogSnapshot);
    const { language } = useLanguage();
    const presentation = useAlarmPresentation();
    const pathname = usePathname();
    useEffect(() => { localize(language); }, [language, catalog.releaseId]);
    useEffect(() => { if(catalogReady){adapter.updateCatalog(catalog.tracks, catalog.enabled);setMusicDownloadCatalog(catalog.tracks,catalog.enabled,catalog.releaseId==='bundled');} }, [adapter, catalogReady, catalog.tracks, catalog.enabled, catalog.releaseId]);
    useEffect(() => {
        let alive = true;
        void (async () => {
            await hydrateMusicCatalog();if(!alive)return;setCatalogReady(true);
            const value = await readMusicRepository();
            if (!alive)
                return;
            hydrated.current = true;
            const merged = mergeMusicHydration(value, repo.current, pendingFavorites.current, touched.current);
            repo.current = merged;
            setFavorites(new Set(merged.favorites));
            setRecents(merged.recents);
            if (!touched.current) {
                // Prefer the live native session; recover an unfinished selection from the repository when none exists.
                await adapter.whenReady();
                if (value.session && (Platform.OS !== 'android' || !adapter.getSnapshot().entryId)) {
                    const s = value.session, c = musicCatalogSnapshot();
                    const q = s.queue.flatMap(e => { const t = c.tracks.find(t => t.id === e.track.id && t.availability === 'available'); return t ? [{ entryId: e.entryId, track: t }] : []; });
                    const id = q.find(e => e.entryId === s.entryId)?.entryId ?? q[0]?.entryId;
                    if (id) {
                        await adapter.replaceQueue(q, id, false);
                        adapter.setSpeed(s.speed);
                        adapter.setRepeat(s.repeat);
                        adapter.setShuffle(s.shuffle);
                        await adapter.seek(Math.min(s.positionMs, adapter.getSnapshot().durationMs));
                    }
                }
            }
            void refreshMusicCatalog();
        })().catch(() => undefined).finally(() => { if(alive)setSessionReady(true); });
        return () => { alive = false; adapter.dispose(); };
    }, [adapter]);
    useEffect(() => { const owner = presentation.active ? 'alarm' : pathname === '/gita' || pathname === '/breathe' || pathname === '/saved' ? 'ritual' : 'none'; adapter.setOwner(owner); }, [adapter, pathname, presentation.active]);
    useEffect(() => { let lastEntry: string | null = null; const save = () => { if (!hydrated.current)
        return; repo.current = { ...repo.current, session: adapter.getSnapshot() }; void writeMusicRepository(repo.current).catch(() => undefined); }; let lastTransition = ''; const unsubscribe = adapter.subscribe(() => { const s = adapter.getSnapshot(); if (!s.entryId) acquireCurrentMusic(null); if (s.interruption === 'alarm' || s.interruption === 'ritual')
        setVisible(false); const transition = JSON.stringify([s.state, s.entryId, s.speed, s.repeat, s.shuffle, s.timer]); if (transition === lastTransition)
        return; lastTransition = transition; if (s.state === 'playing' && s.entryId !== lastEntry) {
        lastEntry = s.entryId;
        const track = s.queue.find(e => e.entryId === s.entryId)?.track;
        if (track) {
            acquireCurrentMusic(track);
            const ids = [track.id, ...repo.current.recents.filter(id => id !== track.id)].slice(0, 20);
            repo.current = { ...repo.current, recents: ids };
            setRecents(ids);
            save();
        }
    }
    else if (s.state !== 'playing')
        save(); }); const interval = setInterval(save, 15000); const app = AppState.addEventListener('change', state => { if (state === 'active')
        void refreshMusicCatalog();
    else
        save(); }); return () => { save(); clearInterval(interval); unsubscribe(); app.remove(); }; }, [adapter]);
    const value = useMemo(() => {
        const playTrack = async (track: MusicTrack, queue: MusicTrack[] = [track], index?: number) => { touched.current = true; const current = musicCatalogSnapshot(); const latest = current.tracks.find(t => t.id === track.id); if (!current.enabled || latest?.availability !== 'available')
            return; const entries: QueueEntry[] = queue.map((t, i) => ({ entryId: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`, track: current.tracks.find(v => v.id === t.id) ?? t })); const id = entries[index ?? entries.findIndex(e => e.track.id === track.id)]?.entryId; if (id)
            await adapter.replaceQueue(entries, id); };
        return { sessionReady, playDownloadedTrack: async (track: MusicTrack) => {
            const current = musicCatalogSnapshot();
            const latest = current.tracks.find(t => t.id === track.id);
            if (!current.enabled || latest?.availability === 'comingSoon' || (!latest && current.releaseId !== 'bundled')) return;
            const saved = (await readDownloadedMusic()).find(t => t.id === track.id && t.asset?.sha256 === track.asset?.sha256);
            if (!saved) throw Error('Download is missing. Download this song again.');
            const playable = latest && latest.asset?.sha256 === saved.asset?.sha256 ? latest : saved;
            touched.current = true;
            adapter.updateCatalog([...current.tracks.filter(t => t.id !== playable.id), playable], true);
            const entryId = `offline-${Date.now()}`;
            await activateTrack(adapter,playable,()=>adapter.replaceQueue([{ entryId, track: playable }], entryId));
        }, activateTrack: (track: MusicTrack, queue?: MusicTrack[], index?: number) => activateTrack(adapter, track, () => playTrack(track, queue, index)), persistenceError,adapter, favorites, recentlyPlayed: recentIds.flatMap(id => { const t = catalog.tracks.find(t => t.id === id); return [t??unavailableMusicTrack(id)]; }), isFullPlayerVisible: visible, playTrack,
            playPlaylist: async (p: Playlist, index = 0, shuffled = false) => { const tracks = p.trackIds.flatMap(id => { const t = musicCatalogSnapshot().tracks.find(t => t.id === id); return [t??unavailableMusicTrack(id)]; }); const playable = tracks.map((t, i) => ({ t, i })).filter(e => e.t.availability === 'available'); if (!playable.length)
                return; adapter.setShuffle(shuffled); const selected = shuffled ? playable[Math.floor(Math.random() * playable.length)] : playable.find(e => e.i >= index) ?? playable[0]; await playTrack(selected.t, tracks, selected.i); },
            toggleFavorite: (id: string) => { if (!hydrated.current)
                pendingFavorites.current.push(id); const ids = new Set(repo.current.favorites); if (ids.has(id))
                ids.delete(id);
            else
                ids.add(id); repo.current = { ...repo.current, favorites: [...ids] }; setFavorites(ids); if (hydrated.current)
                void writeMusicRepository(repo.current).catch(() => undefined); }, openFullPlayer: () => setVisible(true), closeFullPlayer: () => setVisible(false) };
    }, [adapter, catalog, favorites, recentIds, visible,persistenceError,sessionReady]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMusicPlayer(progress = true) {
    const c = useContext(Context);
    if (!c)
        throw Error('MusicPlayerProvider missing');
    const getter=progress?c.adapter.getSnapshot:c.adapter.getLibrarySnapshot;
    const s=useSyncExternalStore(c.adapter.subscribe,getter,getter);
    const a = c.adapter;
    const track = s.queue.find(e => e.entryId === s.entryId)?.track ?? null;
    return { ...c, ...transportAvailability(s), state: s.state, queueEntries: s.queue, currentTrack: track, queue: s.queue.map(e => e.track), queueIndex: s.queue.findIndex(e => e.entryId === s.entryId), isPlaying: s.state === 'playing', isLoading: s.state === 'loading', isBuffering: s.buffering, isSeeking: s.seeking, seekTargetMs: s.seekTargetMs, seekable: s.seekable, bufferedPositionMs: s.bufferedPositionMs, positionMs: s.positionMs, durationMs: s.durationMs, playbackRate: s.speed, shuffle: s.shuffle, repeatMode: s.repeat, sleepTimer: s.timer, sleepRemainingMs: s.remainingMs, error: s.error, interruption: s.interruption, excludedCount: s.excluded,
        togglePlayPause: () => { if (s.state === 'playing' || s.state === 'loading')
            a.pause();
        else
            void a.play().catch(() => undefined); }, pause: () => a.pause(), resume: () => { void a.play().catch(() => undefined); }, stop: () => { c.closeFullPlayer(); a.stop(); }, selectEntry: (id: string) => a.selectEntry(id), seekTo: (ms: number) => a.seek(ms), skipForward: (seconds = 15) => a.seek((a.getSnapshot().seekTargetMs ?? a.getSnapshot().positionMs) + seconds * 1000), skipBackward: (seconds = 15) => a.seek((a.getSnapshot().seekTargetMs ?? a.getSnapshot().positionMs) - seconds * 1000), nextTrack: () => a.next(), prevTrack: () => a.previous(), setPlaybackRate: (r: number) => a.setSpeed(r), toggleShuffle: () => a.setShuffle(!s.shuffle), cycleRepeatMode: () => a.setRepeat(s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off'), setSleepTimer: a.setTimer.bind(a), isFavorite: (id: string) => c.favorites.has(id), retry: () => a.play() };
}
export function useMusicCatalog() { return useSyncExternalStore(subscribeMusicCatalog, musicCatalogSnapshot, musicCatalogSnapshot); }
