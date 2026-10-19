import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { alarmImageIndex, contentAssetFilename, type ContentAsset, type AlarmImageCycle, type ImageAsset, alarmCycleIndex, dateWindow, MB, parseWindow, toneKey, type AlarmCycle, type ContentWindow, type PublishedPractice } from '../../shared/content';
import { localDateKey, type GitaVerse } from '@/data/gita-verses';
import { getNativeAlarmConfig, getRitualCheckpoint, hashContentFile, installAlarmTone, installAlarmCycle, getAlarmMusicStatus, verifyAlarmCycle } from './alarm';

export type CacheSnapshot = { alarmImageCycle?: AlarmImageCycle; days: Record<string, GitaVerse>; saved: GitaVerse[]; alarms: ContentWindow['alarms']; alarmCycles?: AlarmCycle[]; installedKey?: string; installedRevision?: string; wifiOnly: boolean; bytes: number; lastSync: number; error: string | null; syncing: boolean; progress: string; configured: boolean };
type DayRow = { date: string; json: string; asset: string };
type AssetRow = { id: string; path: string; bytes: number; hash: string };
const endpoint = process.env.EXPO_PUBLIC_CONTENT_API_URL ?? '';
const listeners = new Set<() => void>();
const pins = new Map<string, number>();
let inFlight: Promise<void> | null = null;
let cancelled = false;
let cancelDownload: (() => Promise<void>) | null = null;
let transient = { syncing: false, progress: '', error: null as string | null };
let database: Promise<SQLite.SQLiteDatabase> | undefined;
const directory = () => new Directory(Paths.document, 'geeta-content');
const notify = () => listeners.forEach(fn => fn());
export const subscribeContent = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function pinContent(id: string) {
  pins.set(id, (pins.get(id) ?? 0) + 1);
  const owner = `play-${Date.now()}-${Math.random()}`;
  let released = false;
  const renew = async () => { const d = await db(); if (!released) await d.runAsync('INSERT OR REPLACE INTO playback_pins VALUES(?,?,?)', owner, id, Date.now() + 90000); };
  void renew().catch(() => undefined);
  const heartbeat = setInterval(() => { void renew().catch(() => undefined); }, 30000);
  return () => { if (released) return; released = true; clearInterval(heartbeat); const n = (pins.get(id) ?? 1) - 1; if (n) pins.set(id, n); else pins.delete(id); void db().then(d => d.runAsync('DELETE FROM playback_pins WHERE owner=?', owner)).catch(() => undefined); };
}
export function cancelContentSync() { cancelled = true; void cancelDownload?.().catch(() => undefined); }
async function db() {
  database ??= (async () => {
    const d = await SQLite.openDatabaseAsync('geeta-content.db');
    await d.execAsync(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS days(date TEXT PRIMARY KEY, json TEXT NOT NULL, asset TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, path TEXT NOT NULL, bytes INTEGER NOT NULL, hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS transfers(id TEXT PRIMARY KEY, status TEXT NOT NULL, attempts INTEGER NOT NULL, error TEXT, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS saved(id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS saved_media(id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS playback_pins(owner TEXT PRIMARY KEY, asset TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS lease(id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT, expires INTEGER NOT NULL);
      INSERT OR IGNORE INTO lease VALUES(1, NULL, 0);`);
    directory().create({ intermediates: true, idempotent: true });
    return d;
  })();
  return database;
}
async function setting(key: string, fallback = '') { return (await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', key))?.value ?? fallback; }
async function setSetting(key: string, value: string) { await (await db()).runAsync('INSERT OR REPLACE INTO settings VALUES(?,?)', key, value); }
function resolve(row: DayRow, asset?: AssetRow): GitaVerse {
  const practice = JSON.parse(row.json) as PublishedPractice;
  const { narration, ...text } = practice;
  return { ...text, narration: { assetId: narration.asset.id, asset: narration.asset, audioSource: { uri: new File(directory(), asset?.path ?? `${narration.asset.id}-${narration.asset.sha256}.audio`).uri }, completionMs: narration.completionMs, segments: narration.segments } };
}
export async function readContent(): Promise<CacheSnapshot> {
  const d = await db();
  const assets = await d.getAllAsync<AssetRow>('SELECT * FROM assets');
  const map = new Map(assets.map(a => [a.id, a]));
  const rows = await d.getAllAsync<DayRow>('SELECT * FROM days');
  const days = Object.fromEntries(rows.map(row => [row.date, resolve(row, map.get(row.asset))]));
  const saved = (await d.getAllAsync<{ json: string }>('SELECT json FROM saved')).map(row => JSON.parse(row.json) as GitaVerse);
  return { days, saved, alarmImageCycle: JSON.parse(await setting('alarmImageCycle', 'null')) ?? undefined, alarms: JSON.parse(await setting('alarms', '[]')), alarmCycles: JSON.parse(await setting('alarmCycles', '[]')), installedKey: await setting('installedKey'), installedRevision: await setting('installedRevision'), bytes: assets.reduce((sum, a) => sum + a.bytes, 0), wifiOnly: await setting('wifiOnly') === 'true', lastSync: Number(await setting('lastSync', '0')), configured: !!endpoint, ...transient, error: transient.error ?? (await setting('lastError') || null) };
}
export async function setWifiOnly(value: boolean) { await setSetting('wifiOnly', String(value)); notify(); }
export async function saveTeaching(practice: GitaVerse) {
  const { narration: _audio, ...text } = practice;
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO saved VALUES(?,?)', practice.id, JSON.stringify(text));
  const source = await d.getFirstAsync<{ json: string }>('SELECT json FROM days WHERE json_extract(json,\'$.id\')=? AND (? IS NULL OR json_extract(json,\'$.revision\')=?) LIMIT 1', practice.id, practice.revision ?? null, practice.revision ?? null);
  if (_audio?.asset && practice.revision) await d.runAsync('INSERT OR REPLACE INTO saved_media VALUES(?,?)', practice.id, JSON.stringify({ ...text, narration: { asset: _audio.asset, completionMs: _audio.completionMs, segments: _audio.segments } }));
  else if (source) await d.runAsync('INSERT OR REPLACE INTO saved_media VALUES(?,?)', practice.id, source.json);
  notify();
}
export async function removeSavedTeaching(id: string) { const d = await db(); await d.runAsync('DELETE FROM saved WHERE id=?', id); await d.runAsync('DELETE FROM saved_media WHERE id=?', id); notify(); }
export async function prepareSavedReplay(id: string): Promise<{ practice: GitaVerse; release: () => void }> {
  if (inFlight) await inFlight;
  const d = await db(), owner = `saved-${Date.now()}`;
  const acquired = await d.runAsync('UPDATE lease SET owner=?,expires=? WHERE id=1 AND expires<?', owner, Date.now() + 450000, Date.now());
  if (!acquired.changes) throw new Error('Content refresh is running. Try again shortly.');
  cancelled = false;
  try {
    const row = await d.getFirstAsync<{ json: string }>('SELECT json FROM saved_media WHERE id=?', id);
    if (!row) throw new Error('This saved teaching has no downloadable recording');
    const remote = JSON.parse(row.json) as PublishedPractice;
    const asset = remote.narration.asset;
    const existing = await d.getFirstAsync<AssetRow>('SELECT * FROM assets WHERE id=?', asset.id);
    if (!existing || !new File(directory(), existing.path).exists) {
      const network = await Network.getNetworkStateAsync();
      if (!network.isConnected || network.isInternetReachable === false) throw new Error('Connect to the internet to replay this expired recording');
      if (await setting('wifiOnly') === 'true' && network.type !== Network.NetworkStateType.WIFI) throw new Error('Waiting for Wi-Fi');
    }
    const file = await download(asset, owner);
    const release = pinContent(file.id);
    return { practice: resolve({ date: '', json: row.json, asset: file.id }, file), release };
  } finally { await d.runAsync('UPDATE lease SET owner=NULL,expires=0 WHERE owner=?', owner); notify(); }
}
/** Prepare only the frozen revision. Never fetch a newer publication to replace its text or cues. */
export async function preparePracticeRecording(practice: GitaVerse): Promise<{ narration: NonNullable<GitaVerse['narration']>; release: () => void }> {
  if (typeof practice.narration?.audioSource === 'number') return { narration: practice.narration, release: () => {} };
  if (Platform.OS !== 'android') throw new Error('Recording downloads require Android. You can complete by reading.');
  if (inFlight) await inFlight;
  const d = await db(), owner = `practice-${Date.now()}-${Math.random()}`;
  const acquired = await d.runAsync('UPDATE lease SET owner=?,expires=? WHERE id=1 AND expires<?', owner, Date.now() + 450000, Date.now());
  if (!acquired.changes) throw new Error('Content refresh is running. Try again shortly.');
  cancelled = false;
  let release: (() => void) | undefined;
  try {
    let narration = practice.narration;
    if (!narration?.asset && practice.revision) {
      const rows = await d.getAllAsync<{ json: string }>('SELECT json FROM days UNION ALL SELECT json FROM saved_media');
      const match = rows.map(row => JSON.parse(row.json) as PublishedPractice).find(row => row.id === practice.id && row.revision === practice.revision && (!narration?.assetId || row.narration.asset.id === narration.assetId));
      if (match && (!narration || (match.narration.completionMs === narration.completionMs && JSON.stringify(match.narration.segments) === JSON.stringify(narration.segments)))) {
        narration = { ...match.narration, assetId: match.narration.asset.id, audioSource: { uri: '' } };
      }
    }
    if (!narration?.asset) throw new Error('Matching recording metadata is unavailable. You can complete by reading.');
    const asset = narration.asset;
    const existing = await d.getFirstAsync<AssetRow>('SELECT * FROM assets WHERE id=?', asset.id);
    const file = existing ? new File(directory(), existing.path) : new File(directory(), `${asset.id}-${asset.sha256}.audio`);
    const healthy = file.exists && file.size === asset.bytes && await hashContentFile(file.uri) === asset.sha256;
    if (!healthy) {
      const network = await Network.getNetworkStateAsync();
      if (!network.isConnected || network.isInternetReachable === false) throw new Error('Connect to repair this recording, or complete by reading.');
      if (await setting('wifiOnly') === 'true' && network.type !== Network.NetworkStateType.WIFI) throw new Error('Waiting for Wi-Fi');
    }
    const downloaded = await download(asset, owner);
    release = pinContent(asset.id);
    return { narration: { ...narration, assetId: asset.id, audioSource: { uri: new File(directory(), downloaded.path).uri } }, release };
  } finally {
    try { await d.runAsync('UPDATE lease SET owner=NULL,expires=0 WHERE owner=?', owner); }
    catch (error) { release?.(); throw error; }
    finally { notify(); }
  }
}
export async function prepareAlarmPreview(key: string): Promise<string> {
  if (inFlight) await inFlight;
  const d = await db(), owner = `preview-${Date.now()}`;
  const acquired = await d.runAsync('UPDATE lease SET owner=?,expires=? WHERE id=1 AND expires<?', owner, Date.now() + 450000, Date.now());
  if (!acquired.changes) throw new Error('Content refresh is running. Try again shortly.');
  cancelled = false;
  try {
    const network = await Network.getNetworkStateAsync();
    if (await setting('wifiOnly') === 'true' && network.type !== Network.NetworkStateType.WIFI) throw new Error('Waiting for Wi-Fi');
    const cycle = (JSON.parse(await setting('alarmCycles', '[]')) as AlarmCycle[]).find(c => c.key === key);
    const index = cycle ? alarmCycleIndex(cycle, localDateKey()) : null;
    const alarm = (index !== null ? cycle!.tracks[index] : undefined) ?? (JSON.parse(await setting('alarms', '[]')) as ContentWindow['alarms']).find(a => a.key === key);
    if (!alarm) throw new Error('Publish and refresh the alarm catalogue first');
    const asset = await download(alarm.asset, owner);
    return new File(directory(), asset.path).uri;
  } finally { await d.runAsync('UPDATE lease SET owner=NULL,expires=0 WHERE owner=?', owner); notify(); }
}
async function recover() {
  const d = await db();
  for (const row of await d.getAllAsync<AssetRow>('SELECT * FROM assets')) {
    const file = new File(directory(), row.path);
    if (!file.exists || file.size !== row.bytes || await hashContentFile(file.uri) !== row.hash) await d.runAsync('DELETE FROM assets WHERE id=?', row.id);
  }
  const referenced = new Set((await d.getAllAsync<AssetRow>('SELECT * FROM assets')).map(a => a.path));
  let expected: ContentAsset[] = [];
  try {
    const raw = JSON.parse(await setting('manifest')) as ContentWindow;
    const manifest = parseWindow(raw, await setting('windowStart'));
    expected = [...(manifest.alarmImageCycle?.images.filter((a): a is ImageAsset => a !== null) ?? []), ...manifest.days.flatMap(slot => slot.practice ? [slot.practice.narration.asset] : []), ...manifest.alarms.map(a => a.asset), ...(manifest.alarmCycles ?? []).flatMap(c => c.tracks.map(t => t.asset))];
  } catch { /* No previously validated manifest to recover against. */ }
  const persistentPins = new Set((await d.getAllAsync<{ asset: string }>('SELECT asset FROM playback_pins WHERE expires>?', Date.now())).map(p => p.asset));
  for (const entry of directory().list()) {
    if (!(entry instanceof File) || referenced.has(entry.name)) continue;
    const asset = expected.find(a => entry.name === contentAssetFilename(a));
    if (asset && entry.size === asset.bytes && await hashContentFile(entry.uri) === asset.sha256) {
      await d.runAsync('INSERT OR REPLACE INTO assets VALUES(?,?,?,?)', asset.id, entry.name, asset.bytes, asset.sha256);
    } else if (!asset || (!pins.has(asset.id) && !persistentPins.has(asset.id))) entry.delete();
  }
}
async function cleanup(start: string) {
  const d = await db(), dates = dateWindow(start);
  await d.runAsync('DELETE FROM playback_pins WHERE expires<?', Date.now());
  const persistentPins = new Set((await d.getAllAsync<{ asset: string }>('SELECT asset FROM playback_pins')).map(p => p.asset));
  const rows = await d.getAllAsync<DayRow>('SELECT * FROM days ORDER BY date DESC');
  // Retain one most recent playable expired practice only when today's content is absent.
  const fallback = !rows.some(r => r.date === start) ? rows.find(r => r.date < start) : undefined;
  for (const row of rows) if (!dates.includes(row.date) && row.date !== fallback?.date && !pins.has(row.asset) && !persistentPins.has(row.asset)) await d.runAsync('DELETE FROM days WHERE date=?', row.date);
  const images = JSON.parse(await setting('alarmImageCycle', 'null')) as AlarmImageCycle | null;
  const keep = new Set((await d.getAllAsync<DayRow>('SELECT * FROM days')).map(r => r.asset));
  images?.images.forEach(image => { if (image) keep.add(image.id); });
  const selection = JSON.parse(await setting('alarmImageSelection', 'null')) as { image: ImageAsset | null } | null;
  if (selection?.image) keep.add(selection.image.id);
  const ritual = getRitualCheckpoint('gita');
  if (ritual?.stage === 'gita' && ritual.verse.narration?.assetId) keep.add(ritual.verse.narration.assetId);
  const selected = toneKey((await getNativeAlarmConfig())?.tone.key ?? 'gita');
  const alarms = JSON.parse(await setting('alarms', '[]')) as ContentWindow['alarms'];
  const alarm = alarms.find(a => a.key === selected); if (alarm) keep.add(alarm.asset.id);
  const cycle = (JSON.parse(await setting('alarmCycles', '[]')) as AlarmCycle[]).find(c => c.key === selected);
  cycle?.tracks.forEach(t => keep.add(t.asset.id));
  for (const row of await d.getAllAsync<AssetRow>('SELECT * FROM assets')) {
    if (keep.has(row.id) || pins.has(row.id) || persistentPins.has(row.id)) continue;
    await d.runAsync('DELETE FROM assets WHERE id=?', row.id);
    const f = new File(directory(), row.path); if (f.exists) f.delete();
  }
}
class HttpError extends Error { constructor(public status: number, public retryMs: number) { super(`Content server returned ${status}`); } }
async function retry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (cancelled) throw new Error('Download paused');
    try { return await operation(); } catch (error) {
      if (cancelled || attempt === 2 || (error instanceof HttpError && error.status < 500 && error.status !== 429 && error.status !== 408)) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(30000, error instanceof HttpError ? error.retryMs : 1000 * 2 ** attempt) + Math.random() * 300));
    }
  }
}
async function download(asset: ContentAsset, owner: string): Promise<AssetRow> {
  const d = await db();
  const existing = await d.getFirstAsync<AssetRow>('SELECT * FROM assets WHERE id=?', asset.id);
  if (existing && existing.hash === asset.sha256 && new File(directory(), existing.path).exists && new File(directory(), existing.path).size === asset.bytes && await hashContentFile(new File(directory(), existing.path).uri) === asset.sha256) return existing;
  const path = contentAssetFilename(asset), file = new File(directory(), path);
  if (file.exists && file.size === asset.bytes && await hashContentFile(file.uri) === asset.sha256) {
    await d.runAsync('INSERT OR REPLACE INTO assets VALUES(?,?,?,?)', asset.id, path, asset.bytes, asset.sha256);
    return { id: asset.id, path, bytes: asset.bytes, hash: asset.sha256 };
  }
  const used = (await d.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(bytes),0) total FROM assets'))!.total;
  if (used - (existing?.bytes ?? 0) + asset.bytes > 300 * MB || Paths.availableDiskSpace < asset.bytes + 50 * MB) throw new Error('Not enough free storage for upcoming content');
  await retry(async () => {
    if (!(await d.getFirstAsync('SELECT id FROM lease WHERE owner=? AND expires>?', owner, Date.now()))) throw new Error('Sync ownership expired');
    const temp = new File(directory(), `${asset.id}.partial`); if (temp.exists) temp.delete();
    await d.runAsync('INSERT INTO transfers VALUES(?,\'downloading\',1,NULL,?) ON CONFLICT(id) DO UPDATE SET status=\'downloading\',attempts=attempts+1,error=NULL,updated=excluded.updated', asset.id, Date.now());
    const task = FileSystem.createDownloadResumable(asset.url, temp.uri, {}, progress => {
      transient.progress = `${asset.id}: ${Math.round(progress.totalBytesWritten / asset.bytes * 100)}%`; notify();
      if (progress.totalBytesWritten > asset.bytes) void task.cancelAsync();
    });
    cancelDownload = () => task.cancelAsync();
    const timeout = setTimeout(() => { void task.cancelAsync(); }, 120000);
    try {
      const result = await task.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300) throw new HttpError(result?.status ?? 503, 1000);
      if (cancelled || temp.size !== asset.bytes || await hashContentFile(temp.uri) !== asset.sha256) throw new Error('Content checksum verification failed');
      if (!(await d.getFirstAsync('SELECT id FROM lease WHERE owner=? AND expires>?', owner, Date.now()))) throw new Error('Sync ownership expired');
      if (file.exists) file.delete();
      temp.move(file);
      await d.runAsync('INSERT OR REPLACE INTO assets VALUES(?,?,?,?)', asset.id, path, asset.bytes, asset.sha256);
      await d.runAsync('UPDATE transfers SET status=\'verified\',error=NULL,updated=? WHERE id=?', Date.now(), asset.id);
    } catch (error) {
      await d.runAsync('UPDATE transfers SET status=\'failed\',error=?,updated=? WHERE id=?', error instanceof Error ? error.message : String(error), Date.now(), asset.id);
      throw error;
    } finally { clearTimeout(timeout); cancelDownload = null; if (temp.exists && temp.uri !== file.uri) temp.delete(); }
  });
  return { id: asset.id, path, bytes: asset.bytes, hash: asset.sha256 };
}
export async function syncContent(force = false): Promise<void> {
  if (Platform.OS !== 'android' || !endpoint) return;
  if (inFlight) { await inFlight; if (force) return syncContent(true); return; }
  inFlight = runSync(force).finally(() => { inFlight = null; });
  return inFlight;
}
async function runSync(force: boolean) {
  const d = await db(), start = localDateKey(), owner = `${Date.now()}-${Math.random()}`;
  const lease = await d.runAsync('UPDATE lease SET owner=?,expires=? WHERE id=1 AND expires<?', owner, Date.now() + 60000, Date.now());
  if (!lease.changes) return;
  const heartbeat = setInterval(() => { void d.runAsync('UPDATE lease SET expires=? WHERE owner=?', Date.now() + 60000, owner).then(result => { if (!result.changes) cancelContentSync(); }).catch(cancelContentSync); }, 15000);
  cancelled = false; transient = { syncing: true, error: null, progress: 'Checking upcoming content…' }; notify();
  try {
    await setSetting('lastError', '');
    await recover();
    const network = await Network.getNetworkStateAsync();
    if (!network.isConnected || network.isInternetReachable === false) throw new Error('Offline — downloaded practices are still available');
    if (await setting('wifiOnly') === 'true' && network.type !== Network.NetworkStateType.WIFI) throw new Error('Waiting for Wi-Fi');
    const coverage = await d.getAllAsync<DayRow>('SELECT * FROM days WHERE date>=? AND date<=?', start, dateWindow(start)[6]);
    const selectedKey = toneKey((await getNativeAlarmConfig())?.tone.key ?? 'gita');
    const currentTone = (JSON.parse(await setting('alarms', '[]')) as ContentWindow['alarms']).find(a => a.key === selectedKey);
    const currentCycle = (JSON.parse(await setting('alarmCycles', '[]')) as AlarmCycle[]).find(c => c.key === selectedKey);
    const nativeMusic = await getAlarmMusicStatus(selectedKey);
    const cycleReady = !currentCycle || nativeMusic?.revision === currentCycle.revision || nativeMusic?.pendingRevision === currentCycle.revision;
    const alarmReady = cycleReady && currentTone && await setting('installedKey') === selectedKey && await setting('installedRevision') === currentTone.revision;
    const installedImages = JSON.parse(await setting('alarmImageCycle', 'null')) as AlarmImageCycle | null;
    const pendingManifest = JSON.parse(await setting('manifest', 'null')) as ContentWindow | null;
    let imagesReady = !pendingManifest?.alarmImageCycle || pendingManifest.alarmImageCycle.revision === installedImages?.revision;
    if (imagesReady && installedImages) {
      for (const image of installedImages.images) {
        if (!image) continue;
        const row = await d.getFirstAsync<AssetRow>('SELECT * FROM assets WHERE id=? AND hash=?', image.id, image.sha256);
        if (!row || !new File(directory(), row.path).exists) imagesReady = false;
      }
    }
    if (!force && imagesReady && alarmReady && coverage.length === 7 && await setting('windowStart') === start && Date.now() - Number(await setting('lastCheck', '0')) < 3600000) return;
    const url = new URL(endpoint); if (url.protocol !== 'https:' && !(__DEV__ && ['localhost', '10.0.2.2', '127.0.0.1'].includes(url.hostname))) throw new Error('Configure an HTTPS content API');
    url.searchParams.set('start', start); url.searchParams.set('days', '7'); url.searchParams.set('locale', 'hi-IN');
    let manifest: ContentWindow | undefined;
    await retry(async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
      try {
        const headers: Record<string, string> = {};
        if (!force && await setting('windowStart') === start) headers['If-None-Match'] = await setting('etag');
        const response = await fetch(url.href, { headers, signal: controller.signal });
        if (response.status === 304) { manifest = parseWindow(JSON.parse(await setting('manifest')), start); return; }
        if (!response.ok) { const delay = response.headers.get('Retry-After'); throw new HttpError(response.status, delay ? Math.max(1000, Number(delay) * 1000 || Date.parse(delay) - Date.now()) : 1000); }
        const text = await response.text(); if (text.length > 2 * MB) throw new Error('Content manifest too large');
        manifest = parseWindow(JSON.parse(text), start);
        await setSetting('manifest', JSON.stringify(manifest)); await setSetting('etag', response.headers.get('ETag') ?? ''); await setSetting('windowStart', start);
      } finally { clearTimeout(timer); }
    });
    if (!manifest) throw new Error('Missing content manifest');
    await setSetting('lastCheck', String(Date.now()));
    if (!manifest.enabled) { transient.progress = 'Content refresh paused by publisher'; return; }
    // Absence is not a deletion instruction. Keep installed music and its download metadata.
    const oldAlarms = JSON.parse(await setting('alarms', '[]')) as ContentWindow['alarms'];
    await setSetting('alarms', JSON.stringify([...oldAlarms.filter(a => !manifest!.alarms.some(n => n.key === a.key)), ...manifest.alarms]));
    const oldCycles = JSON.parse(await setting('alarmCycles', '[]')) as AlarmCycle[];
    const cycles = [...oldCycles.filter(c => !(manifest!.alarmCycles ?? []).some(n => n.key === c.key)), ...(manifest.alarmCycles ?? [])];
    await setSetting('alarmCycles', JSON.stringify(cycles));
    const config = await getNativeAlarmConfig(), selected = toneKey(config?.tone.key ?? 'gita');
    const alarm = (JSON.parse(await setting('alarms', '[]')) as ContentWindow['alarms']).find(a => a.key === selected);
    const cycle = cycles.find(c => c.key === selected);
    const install = async () => {
      if (cycle) {
        const native = await getAlarmMusicStatus(selected);
        if ((native?.revision !== cycle.revision && native?.pendingRevision !== cycle.revision) || !await verifyAlarmCycle(selected, cycle.revision)) {
          const unique = [...new Map(cycle.tracks.map(t => [t.asset.id, t.asset])).values()];
          const used = (await d.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(bytes),0) total FROM assets'))!.total;
          const total = unique.reduce((sum, a) => sum + a.bytes, 0);
          // Reserve both download staging and independent native copies before starting.
          if (Paths.availableDiskSpace < total * 2 + 50 * MB || used + (native?.bytes ?? 0) + total * 2 > 600 * MB) throw new Error('Not enough free storage for alarm music; previous music is still available');
          const tracks = [];
          for (const track of cycle.tracks) {
            if (cancelled) throw new Error('Download paused');
            const a = await download(track.asset, owner);
            tracks.push({ title: track.title, uri: new File(directory(), a.path).uri, bytes: track.asset.bytes, sha256: track.asset.sha256 });
          }
          if (cancelled) throw new Error('Download paused');
          await installAlarmCycle({ key: selected, revision: cycle.revision, startDate: cycle.startDate, tracks });
          notify();
        }
      }
      // A failed cycle must not replace the previous single-track installation either.
      if (!alarm) return;
      const native = cycle ? await getAlarmMusicStatus(selected) : null;
      // Stage future cycles without changing the single track that is still in use today.
      if (cycle && cycle.startDate > start && native?.fallbackRevision) return;
      const a = await download(alarm.asset, owner);
      await installAlarmTone({ key: selected, revision: alarm.revision, uri: new File(directory(), a.path).uri, bytes: alarm.asset.bytes, sha256: alarm.asset.sha256, title: alarm.title });
      await setSetting('installedKey', selected); await setSetting('installedRevision', alarm.revision); notify();
    };
    const failures: string[] = manifest.days.filter(slot => !slot.practice).map(slot => `${slot.date}: content has not been published`);
    for (let i = 0; i < manifest.days.length; i++) {
      const slot = manifest.days[i];
      if (cancelled) throw new Error('Download paused');
      if (slot.practice) {
        try {
          await download(slot.practice.narration.asset, owner);
          await d.runAsync('INSERT OR REPLACE INTO days VALUES(?,?,?)', slot.date, JSON.stringify(slot.practice), slot.practice.narration.asset.id); notify();
        } catch (error) { failures.push(`${slot.date}: ${error instanceof Error ? error.message : 'Download failed'}`); }
      }
      if (i === 0) { try { await install(); } catch (error) { failures.push(error instanceof Error ? error.message : 'Alarm installation failed'); } }
    }
    if (manifest.alarmImageCycle) {
      try {
        for (const image of manifest.alarmImageCycle.images) if (image) await download(image, owner);
        if (cancelled) throw new Error('Download paused');
        // The installed cycle changes only after every nonempty slot is verified.
        await setSetting('alarmImageCycle', JSON.stringify(manifest.alarmImageCycle));
        notify();
      } catch (error) { failures.push(`Alarm images: ${error instanceof Error ? error.message : 'Download failed'}`); }
    }
    await cleanup(start);
    if (failures.length) throw new Error(failures.join('\n'));
    await setSetting('lastSync', String(Date.now()));
    transient.progress = 'Upcoming content is ready';
  } catch (error) { transient.error = error instanceof Error ? error.message : 'Content refresh failed'; await setSetting('lastError', transient.error); }
  finally { clearInterval(heartbeat); await d.runAsync('UPDATE lease SET owner=NULL,expires=0 WHERE owner=?', owner); transient.syncing = false; notify(); }
}
export async function clearContentDownloads() {
  if (inFlight) { cancelContentSync(); await inFlight; }
  const d = await db(), owner = `clear-${Date.now()}`;
  const result = await d.runAsync('UPDATE lease SET owner=?,expires=? WHERE id=1 AND expires<?', owner, Date.now() + 60000, Date.now());
  if (!result.changes) throw new Error('A background refresh is running. Try again shortly.');
  try {
    const persistentPins = new Set((await d.getAllAsync<{ asset: string }>('SELECT asset FROM playback_pins WHERE expires>?', Date.now())).map(p => p.asset));
    const imageSelection = JSON.parse(await setting('alarmImageSelection', 'null')) as { image: ImageAsset | null } | null;
    if (imageSelection?.image) persistentPins.add(imageSelection.image.id);
    const ritual = getRitualCheckpoint('gita');
    if (ritual?.stage === 'gita' && ritual.verse.narration?.assetId) persistentPins.add(ritual.verse.narration.assetId);
    for (const a of await d.getAllAsync<AssetRow>('SELECT * FROM assets')) {
      if (pins.has(a.id) || persistentPins.has(a.id)) continue;
      await d.runAsync('DELETE FROM days WHERE asset=?', a.id);
      await d.runAsync('DELETE FROM assets WHERE id=?', a.id);
      const file = new File(directory(), a.path); if (file.exists) file.delete();
    }
    await setSetting('lastCheck', '0');
  } finally { await d.runAsync('UPDATE lease SET owner=NULL,expires=0 WHERE owner=?', owner); notify(); }
}

/** Only a verified document-directory URI may reach the alarm renderer. */
export async function prepareAlarmImage(date: string, sessionId?: string | null): Promise<{ uri: string; release: () => void } | null> {
  const d = await db();
  const cycle = JSON.parse(await setting('alarmImageCycle', 'null')) as AlarmImageCycle | null;
  const previous = JSON.parse(await setting('alarmImageSelection', 'null')) as { sessionId: string; image: ImageAsset | null } | null;
  const index = cycle ? alarmImageIndex(cycle, date) : null;
  const image = sessionId && previous?.sessionId === sessionId ? previous.image : cycle && index !== null ? cycle.images[index] : null;
  const remember = async (value: ImageAsset | null) => {
    if (sessionId) await setSetting('alarmImageSelection', JSON.stringify({ sessionId, image: value }));
  };
  if (!image) { await remember(null); return null; }
  const release = pinContent(image.id);
  try {
    const row = await d.getFirstAsync<AssetRow>('SELECT * FROM assets WHERE id=? AND hash=?', image.id, image.sha256);
    if (!row) { await remember(null); release(); return null; }
    const file = new File(directory(), row.path);
    if (!file.exists || file.size !== image.bytes || await hashContentFile(file.uri) !== image.sha256) { await remember(null); release(); return null; }
    await remember(image);
    return { uri: file.uri, release };
  } catch { release(); return null; }
}
