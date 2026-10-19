import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { readDownloadedMusic, readMusicDownloadViews, subscribeMusicDownloads, type MusicDownloadView } from './music-downloads';
import type { MusicTrack } from '@/types/music';

export function useMusicDownloads() {
    const [views, setViews] = useState<MusicDownloadView[]>([]);
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [error, setError] = useState('');
    useEffect(() => {
        if (Platform.OS === 'web') return;
        let alive = true, generation = 0;
        const load = () => {
            const request = ++generation;
            void Promise.all([readMusicDownloadViews(), readDownloadedMusic()]).then(([next, saved]) => {
                if (alive && request === generation) { setViews(next); setTracks(saved); setError(''); }
            }).catch(failure => { if (alive && request === generation) setError(String(failure)); });
        };
        load();
        const unsubscribe = subscribeMusicDownloads(load);
        return () => { alive = false; unsubscribe(); };
    }, []);
    return { views, tracks, error };
}
