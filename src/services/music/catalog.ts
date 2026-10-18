import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { musicDatabase } from './database';
import { BUNDLED_GITA } from '../../../shared/music';
import { BUNDLED_AUDIO, BUNDLED_MUSIC_RELEASE, SACRED_TRACKS, SACRED_PLAYLISTS } from '@/data/music-catalog';
import type { MusicTrack, Playlist } from '@/types/music';
import { parseMusicReleaseV2, migrateMusicRelease, type MusicReleaseV2 } from '../../../shared/music-presentation';
const endpoint = process.env.EXPO_PUBLIC_MUSIC_API_URL ?? '';
const webKey = '@aarambh_music_catalog_v1';
let currentLanguage = 'en';
let release: MusicReleaseV2 = migrateMusicRelease(BUNDLED_MUSIC_RELEASE);
let lastAttempt = 0;
let inFlight: Promise<void> | null = null;
let error: string | null = null;
let snapshot: { tracks: MusicTrack[]; playlists: Playlist[]; releaseId: string; enabled: boolean; error: string | null; page: MusicReleaseV2 } = {
  tracks: SACRED_TRACKS, playlists: SACRED_PLAYLISTS, releaseId: 'bundled', enabled: true, error, page: release,
};
const listeners = new Set<() => void>();
export const subscribeMusicCatalog = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const musicCatalogSnapshot = () => snapshot;
function publish(next: MusicReleaseV2) {
  release = next;
  localize(currentLanguage);
}
export function localize(language: string) {
  currentLanguage = language;
  const tracks: MusicTrack[] = release.tracks.map(track => {
    const metadata = language === 'hi' ? track.metadata.hi ?? track.metadata.en : track.metadata.en;
    return {
      ...metadata, id: track.id, revision: track.revision,
      availability: release.enabled ? track.availability : 'comingSoon',
      category: track.category, categoryTheme: release.categories.find(c => c.id === track.category)?.theme, artist: metadata.artist ?? '',
      durationMs: track.availability === 'available' ? track.asset?.durationMs ?? BUNDLED_GITA.durationMs : 0,
      asset: track.asset, bundledId: track.bundledId,
      audioSource: track.bundledId ? BUNDLED_AUDIO[track.bundledId as keyof typeof BUNDLED_AUDIO] : undefined,
      artworkThumbnail: release.media.find(m => m.id === track.imageId)?.thumbnail,
      artworkAlt: release.media.find(m => m.id === track.imageId)?.alt[language === 'hi' ? 'hi' : 'en'],
      artworkUrl: release.media.find(m => m.id === track.imageId)?.square ?? track.artworkUrl, lyrics: track.lyrics, tags: track.tags,
    };
  });
  const playlists: Playlist[] = release.playlists.map(playlist => {
    const metadata = language === 'hi' ? playlist.metadata.hi ?? playlist.metadata.en : playlist.metadata.en;
    const staticItem = SACRED_PLAYLISTS.find(p => p.id === playlist.id);
    return {
      id: playlist.id, title: metadata.title, subtitle: metadata.subtitle,
      description: playlist.description ? (language === 'hi' ? playlist.description.hi || playlist.description.en : playlist.description.en) : metadata.subtitle ?? '', category: 'curated', trackIds: playlist.trackIds, isCurated: true,
      coverThumbnail: release.media.find(m => m.id === playlist.imageId)?.thumbnail,
      coverImage: release.media.find(m => m.id === playlist.imageId)?.banner ?? staticItem?.coverImage,
    };
  });
  snapshot = { tracks, playlists, releaseId: release.releaseId, enabled: release.enabled, error, page: release };
  listeners.forEach(listener => listener());
}
export async function hydrateMusicCatalog() {
  try {
    const json = Platform.OS === 'web'
      ? await AsyncStorage.getItem(webKey)
      : (await (await musicDatabase()).getFirstAsync<{ json: string }>('SELECT json FROM music_cache WHERE key=?', 'release'))?.json;
    if (json) publish(parseMusicReleaseV2(JSON.parse(json)));
  } catch (failure) {
    error = String(failure);
    localize(currentLanguage);
  }
}
export function refreshMusicCatalog(manual = false) {
  if (inFlight) return inFlight;
  if (!endpoint || (!manual && Date.now() - lastAttempt < 300000)) return Promise.resolve();
  lastAttempt = Date.now();
  inFlight = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const etag = Platform.OS === 'web' ? await AsyncStorage.getItem(webKey + ':etag') : (await (await musicDatabase()).getFirstAsync<{ json: string }>('SELECT json FROM music_cache WHERE key=?', 'etag'))?.json;
      let response = await fetch(`${endpoint.replace(/\/$/, '')}/catalog-v2`, { signal: controller.signal, headers: etag && release.releaseId !== 'bundled' ? { 'If-None-Match': etag } : {} });
      if (response.status === 404) response = await fetch(`${endpoint.replace(/\/$/, '')}/catalog`, { signal: controller.signal });
      if (response.status === 304) { error = null; localize(currentLanguage); return; }
      if (!response.ok) throw Error(`Catalog refresh failed (${response.status})`);
      const body = await response.text();
      if (body.length > 1000000) throw Error('Catalog response too large');
      const next = parseMusicReleaseV2(JSON.parse(body));
      if (Platform.OS === 'web') await AsyncStorage.setItem(webKey, JSON.stringify(next));
      else await (await musicDatabase()).runAsync('INSERT OR REPLACE INTO music_cache VALUES(?,?)', 'release', JSON.stringify(next));
      const tag = response.headers.get('ETag') ?? '';
      if (Platform.OS === 'web') await AsyncStorage.setItem(webKey + ':etag', tag);
      else await (await musicDatabase()).runAsync('INSERT OR REPLACE INTO music_cache VALUES(?,?)', 'etag', tag);
      error = null;
      publish(next);
    } catch (failure) {
      error = String(failure);
      localize(currentLanguage);
    } finally {
      clearTimeout(timeout);
      inFlight = null;
    }
  })();
  return inFlight;
}
