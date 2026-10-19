import { AppState, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as FS from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { hashContentFile } from './alarm';
import { musicDatabase } from './music/database';
import { MUSIC_BUDGET, parseMusicAsset } from '../../shared/music';
import type { MusicTrack } from '@/types/music';
export type TransferStatus = 'queued' | 'downloading' | 'verifying' | 'ready' | 'cancelled' | 'failed' | 'paused';
type Row = {
    hash: string;
    track: string;
    json: string;
    path: string;
    bytes: number;
    status: TransferStatus;
    resume: string | null;
    error: string | null;
};
const dir = () => new Directory(Paths.document, 'music-audio-v1');
const temporaryDir = () => new Directory(Paths.cache ?? Paths.document, 'music-full-v1');
const native = requireOptionalNativeModule('MusicPlayback');
const files = requireOptionalNativeModule('MusicFiles');
const hashFile=async(uri:string):Promise<string>=>{
  if(Platform.OS==='ios'){
    if(!files)throw Error('Verified music downloads require the updated iOS native build.');
    return files.hashFile(uri);
  }
  return hashContentFile(uri);
};
const pins = new Map<string, number>();
export function pinMusicFile(uri: string) { pins.set(uri, (pins.get(uri) ?? 0) + 1); let released = false; return () => { if (released)
    return; released = true; const n = (pins.get(uri) ?? 1) - 1; if (n)
    pins.set(uri, n);
else
    pins.delete(uri); }; }
const jobs = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();
let tail = Promise.resolve(), active: FS.DownloadResumable | null = null, pauseReason: string | null = null, initialized: Promise<void> | null = null;
let wifiOnly = false;
const keepRequests = new Set<string>();
export type MusicDownloadView = { hash: string; track: MusicTrack; saved: boolean; status: TransferStatus; bytesWritten: number; totalBytes: number; path: string; error: string | null };
const acquisitionViews = new Map<string, MusicDownloadView>();
let activeAutomatic: MusicTrack | null = null;
async function rememberTrack(track: MusicTrack, saved: boolean) {
    if (!track.asset) return;
    const d = await db();
    const existing = await d.getFirstAsync<{ saved: number }>('SELECT saved FROM music_download_tracks WHERE hash=?',track.asset.sha256);
    if(!existing && await d.getFirstAsync<Row>('SELECT * FROM downloads WHERE hash=?',track.asset.sha256)) saved = true;
    await d.runAsync('INSERT INTO music_download_tracks VALUES(?,?,?) ON CONFLICT(hash) DO UPDATE SET json=excluded.json,saved=MAX(music_download_tracks.saved,excluded.saved)', track.asset.sha256, JSON.stringify(track), saved ? 1 : 0);
}
let acquisitionWrites: Promise<void> = Promise.resolve();
function reconcileAcquisition(view: MusicDownloadView): Promise<void> {
    acquisitionWrites = acquisitionWrites.catch(() => undefined).then(async () => {
        acquisitionViews.set(view.hash, view);
        if (view.saved) {
            await rememberTrack(view.track, true);
            const d = await db();
            await d.runAsync('INSERT OR REPLACE INTO downloads VALUES(?,?,?,?,?,?,?,?)', view.hash, view.track.id, JSON.stringify(view.track.asset), view.path, view.totalBytes, view.status, null, view.error);
        }
        notify();
    });
    return acquisitionWrites;
}
export async function readMusicDownloadViews(): Promise<MusicDownloadView[]> {
    if (Platform.OS === 'web') return [];
    const rows = await readMusicDownloads();
    const metadata = await (await db()).getAllAsync<{ hash: string; json: string; saved: number }>('SELECT * FROM music_download_tracks');
    const views = new Map(acquisitionViews);
    for (const row of rows) {
        const meta = metadata.find(m => m.hash === row.hash);
        let track = catalogTracks.get(row.track);
        if(meta) { try { track = JSON.parse(meta.json) as MusicTrack; } catch { /* Keep other saved songs accessible if one metadata row is damaged. */ } }
        if (track && (!views.has(row.hash) || (meta?.saved !== 0 && row.status === 'ready' && !views.get(row.hash)?.saved))) views.set(row.hash, { hash: row.hash, track, saved: meta?.saved !== 0, status: row.status, bytesWritten: row.status === 'ready' ? row.bytes : 0, totalBytes: row.bytes, path: row.path, error: row.error });
    }
    return [...views.values()];
}
export async function readDownloadedMusic(): Promise<MusicTrack[]> {
    const views = await readMusicDownloadViews();
    const saved = views.filter(v => v.saved && v.status === 'ready' && new File(v.path).exists && new File(v.path).size === v.totalBytes).map(v => {
        const current=catalogTracks.get(v.track.id);
        return current && current.asset?.sha256===v.hash ? current : v.track;
    });
    const included = [...catalogTracks.values()].filter(t => t.bundledId && t.availability === 'available');
    return [...new Map([...included, ...saved].map(t => [t.id, t])).values()].filter(t => !catalogKnown || (catalogEnabled && (catalogTracks.get(t.id)?.availability === 'available' || (catalogFallback && !catalogTracks.has(t.id)))));
}
export function acquireCurrentMusic(track: MusicTrack | null) {
    if (Platform.OS === 'web') return;
    activeAutomatic = track;
    if(active && activeTrackId!==track?.id && ![...acquisitionViews.values()].some(v => v.track.id===activeTrackId && (v.saved || keepRequests.has(v.hash)))) {
        pauseReason='superseded';void active.pauseAsync().catch(() => undefined);
    }
    if (Platform.OS === 'android') {
        if(track?.asset && native?.acquire)void native.acquire(JSON.stringify(track),false).catch(() => undefined);
        return;
    }
    if (track?.asset && track.availability === 'available') void transferTrack(track, false).catch(() => undefined);
}
async function resumeAcquisitions() {
    if (AppState.currentState !== 'active') return;
    const views = await readMusicDownloadViews();
    for (const view of views.filter(v => v.saved && v.status === 'paused')) void downloadTrack(view.track).catch(() => undefined);
    if (activeAutomatic) acquireCurrentMusic(activeAutomatic);
}
let catalogKnown=false, catalogEnabled=true, catalogFallback=false, activeTrackId:string|null=null;
let catalogTracks=new Map<string,MusicTrack>();
let reservationTail=Promise.resolve();
export function setMusicDownloadCatalog(tracks:MusicTrack[],enabled:boolean,allowSavedFallback=false){
  catalogKnown=true;catalogEnabled=enabled;catalogFallback=allowSavedFallback;catalogTracks=new Map(tracks.map(t=>[t.id,t]));
  for (const track of tracks) { if (track.asset) void rememberTrack(track, false).catch(() => undefined); }
  notify();
  if(active && activeTrackId && (!enabled || catalogTracks.get(activeTrackId)?.availability!=='available')){pauseReason='catalog';void active.pauseAsync().catch(()=>undefined);}
}
function checkCatalog(track:MusicTrack){
  if(!catalogKnown)return;
  const latest=catalogTracks.get(track.id);
  if(!catalogEnabled || latest?.availability!=='available')throw Error('This recording is coming soon');
  if(latest.asset?.sha256!==track.asset?.sha256)throw Error('Recording updated. Select it again before downloading.');
}
async function reserve(track:MusicTrack,asset:NonNullable<MusicTrack['asset']>,save=true){
  await initializeMusicDownloads();checkCatalog(track);
  const d=await db(),hash=asset.sha256,path=new File(save ? dir() : temporaryDir(),`${hash}.audio`).uri;
  await rememberTrack(track,save);
  const old=await d.getFirstAsync<Row>('SELECT * FROM downloads WHERE hash=?',hash);
  if(old?.status==='ready'&&await verified(old)) {
    if(save && old.path!==path) { new File(old.path).copy(new File(path));await d.runAsync('UPDATE downloads SET path=? WHERE hash=?',path,hash); }
    return {d,path:save?path:old.path,old,ready:true};
  }
  if(pins.has(path)||await native?.isPinned(path))throw Error('Stop music before redownloading this recording.');
  await d.withExclusiveTransactionAsync(async tx=>{
    const total=await tx.getFirstAsync<{n:number}>('SELECT COALESCE(SUM(bytes),0) n FROM downloads WHERE hash<>? AND hash NOT IN (SELECT hash FROM music_download_tracks WHERE saved=0)',hash);
    if(save && (total?.n??0)+asset.bytes>MUSIC_BUDGET)throw Error('Music storage is full. Delete downloads to make space.');
    if(await FS.getFreeDiskStorageAsync()<asset.bytes*2+20*1024*1024)throw Error('Not enough free device storage');
    await tx.runAsync('INSERT OR REPLACE INTO downloads VALUES(?,?,?,?,?,?,?,?)',hash,track.id,JSON.stringify(asset),path,asset.bytes,'queued',old?.resume??null,null);
  });notify();return {d,path,old,ready:false};
}
export const subscribeMusicDownloads = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const notify = () => listeners.forEach(l => l());
const db = musicDatabase;
export async function readMusicDownloads() { await initializeMusicDownloads(); return (await db()).getAllAsync<Row>('SELECT * FROM downloads'); }
export async function setMusicWifiOnly(value: boolean) { wifiOnly = value; await (await db()).runAsync('INSERT OR REPLACE INTO music_settings VALUES(?,?)', 'wifiOnly', String(value)); if (value)
    await enforcePolicy(); notify(); }
export const getMusicWifiOnly = () => wifiOnly;
async function allowed() { const n = await Network.getNetworkStateAsync(); return AppState.currentState === 'active' && n.isConnected === true && (!wifiOnly || n.type === Network.NetworkStateType.WIFI); }
async function enforcePolicy() { if (active && !await allowed()) {
    pauseReason = 'policy';
    await active.pauseAsync().catch(() => undefined);
} }
export async function initializeMusicDownloads() {
    if (Platform.OS === 'web')
        return;
    return initialized ??= (async () => {
        const d = await db();
        dir().create({ idempotent: true, intermediates: true });
        // Retire the old Wi-Fi gate: explicit downloads use the user's current connection.
        wifiOnly = false;
        await d.runAsync('INSERT OR REPLACE INTO music_settings VALUES(?,?)', 'wifiOnly', 'false');
        temporaryDir().create({ idempotent: true, intermediates: true });
        if (Platform.OS === 'android' && native?.acquisitions) {
            native.addListener('acquisition', (view: MusicDownloadView) => { void reconcileAcquisition(view).catch(() => undefined); });
            const nativeViews = await native.acquisitions() as MusicDownloadView[];
            for (const view of nativeViews) await reconcileAcquisition(view);
        }
        const rows = await d.getAllAsync<Row>('SELECT * FROM downloads');
        for (const row of rows) {
            const f = new File(row.path);
            if (row.status === 'ready' && (!f.exists || f.size !== row.bytes))
                await d.runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?', 'failed', 'Downloaded file is missing or damaged', row.hash);
            else if (!native?.acquisitions && ['downloading', 'verifying', 'queued'].includes(row.status))
                await d.runAsync('UPDATE downloads SET status=? WHERE hash=?', 'paused', row.hash);
        }
        const known = new Set(rows.flatMap(r => [r.path, `${r.path}.partial`]));
        for (const f of dir().list())
            if (f instanceof File && !known.has(f.uri))
                f.delete();
        // Legacy files and data remain intact for recovery; size-only verification is never imported.
        Network.addNetworkStateListener(() => { void enforcePolicy();void resumeAcquisitions().catch(() => undefined); });
        AppState.addEventListener('change', () => { void enforcePolicy();void resumeAcquisitions().catch(() => undefined); });
        setTimeout(() => { void resumeAcquisitions().catch(() => undefined); }, 0);
    })();
}
async function verified(row: Row) { const f = new File(row.path); return f.exists && f.size === row.bytes && await hashFile(f.uri) === row.hash; }
export async function isTrackDownloaded(trackId: string) { if (Platform.OS === 'web')
    return false; await initializeMusicDownloads(); const rows = await (await db()).getAllAsync<Row>('SELECT * FROM downloads WHERE track=? AND status=?', trackId, 'ready'); for (const row of rows) {
    if (await verified(row))
        return true;
    await quarantine(row);
} return false; }
async function quarantine(row: Row) { await (await db()).runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?', 'failed', 'Checksum verification failed. Redownload this recording.', row.hash); notify(); }
export async function resolveMusicSource(track: MusicTrack): Promise<number | {
    uri: string;
}> {
    if (track.availability !== 'available')
        throw Error('This recording is coming soon');
    if (track.asset && Platform.OS !== 'web') {
        await initializeMusicDownloads();
        const row = await (await db()).getFirstAsync<Row>('SELECT * FROM downloads WHERE hash=? AND status=?', track.asset.sha256, 'ready');
        if (row) {
            if (await verified(row))
                return { uri: row.path };
            await quarantine(row);
        }
    }
    if (track.audioSource !== undefined)
        return track.audioSource;
    if (track.asset)
        return { uri: track.asset.url };
    throw Error('No verified audio source');
}
export function downloadTrack(track: MusicTrack, onProgress?: (ratio: number) => void): Promise<string> {
    wifiOnly=false;
    if(track.asset)keepRequests.add(track.asset.sha256);
    return transferTrack(track,true,onProgress);
}
function transferTrack(track: MusicTrack, save: boolean, onProgress?: (ratio: number) => void): Promise<string> {
    if (track.availability !== 'available')
        return Promise.reject(Error('Coming soon'));
    if (!track.asset)
        return Promise.reject(Error('This recording is included with the app'));
    if (Platform.OS === 'web')
        return Promise.reject(Error('Music downloads are available in the mobile app.'));
    const asset = parseMusicAsset(track.asset), hash = asset.sha256;
    if (jobs.has(hash)) {
        if(save) {
            void rememberTrack(track,true).catch(() => undefined);
            if(Platform.OS === 'android' && native?.acquire) void native.acquire(JSON.stringify(track),true).catch(() => undefined);
        }
        return jobs.get(hash)!;
    }
    try{checkCatalog(track);}catch(error){return Promise.reject(error);}
    const reservation=reservationTail.catch(()=>undefined).then(()=>reserve(track,asset,save || keepRequests.has(hash)));
    reservationTail=reservation.then(()=>undefined,()=>undefined);
    // Reserve and expose Queued immediately, while network transfers remain serialized.
    const job=tail.catch(()=>undefined).then(async()=>{
        const {d,path,old,ready}=await reservation;
        if(ready)return path;
        if(!save && !keepRequests.has(hash) && activeAutomatic?.asset?.sha256!==hash) {
            await d.runAsync('UPDATE downloads SET status=? WHERE hash=?','paused',hash);notify();throw Error('Download paused');
        }
        if (Platform.OS === 'android' && native?.acquire) {
            const subscription = native.addListener('acquisition', (view: MusicDownloadView) => { if(view.hash===hash)onProgress?.(view.bytesWritten/view.totalBytes); });
            try {
                const local = await native.acquire(JSON.stringify(track),save || keepRequests.has(hash));
                const views = await native.acquisitions() as MusicDownloadView[];
                const completed = views.find(v => v.hash === hash);
                if(completed)await reconcileAcquisition(completed);
                return local;
            } catch(error) {
                const views = await native.acquisitions() as MusicDownloadView[];
                const stopped = views.find(v => v.hash === hash && ['paused','failed','cancelled'].includes(v.status));
                if(stopped)await reconcileAcquisition(stopped);
                else {
                    await d.runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?','failed',String(error),hash);
                    acquisitionViews.set(hash,{hash,track,saved:save || keepRequests.has(hash),status:'failed',bytesWritten:0,totalBytes:asset.bytes,path,error:String(error)});notify();
                }
                throw error;
            } finally { subscription.remove(); }
        }
        try{checkCatalog(track);}catch(error){await d.runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?','failed',String(error),hash);notify();throw error;}
        if (!await allowed()) {
            await d.runAsync('UPDATE downloads SET status=? WHERE hash=?', 'paused', hash);
            notify();
            throw Error('Download paused. Open the app on an allowed network and choose Resume.');
        }
        pauseReason = null; activeTrackId=track.id;
        const partial = `${path}.partial`;
        if(!save && !keepRequests.has(hash)) await evictTemporary(asset.bytes,path);
        try {
            await d.runAsync('UPDATE downloads SET status=? WHERE hash=?', 'downloading', hash);
            notify();
            let resume: string | undefined;
            if (old?.resume && old.json === JSON.stringify(asset) && new File(partial).exists) {
                try {
                    resume = JSON.parse(old.resume).resumeData;
                }
                catch {
                    resume = undefined;
                }
            }
            acquisitionViews.set(hash,{hash,track,saved:save || keepRequests.has(hash),status:'downloading',bytesWritten:0,totalBytes:asset.bytes,path,error:null});notify();
            active = FS.createDownloadResumable(asset.url, partial, {}, p => { onProgress?.(Math.min(1, p.totalBytesWritten / asset.bytes));
                const view=acquisitionViews.get(hash);if(view){view.bytesWritten=p.totalBytesWritten;view.saved=save || keepRequests.has(hash);notify();} if (p.totalBytesWritten > asset.bytes) {
                pauseReason = 'oversized';
                void active?.pauseAsync();
            } }, resume);
            const result = resume ? await active.resumeAsync() : await active.downloadAsync();
            if (pauseReason === 'oversized') {
                pauseReason = null;
                const f = new File(partial);
                if (f.exists)
                    f.delete();
                throw Error('Download size verification failed');
            }
            if (pauseReason || !result) {
                const saved = active.savable();
                await d.runAsync('UPDATE downloads SET status=?,resume=? WHERE hash=?', pauseReason === 'cancel' ? 'cancelled' : 'paused', JSON.stringify(saved), hash);
                throw Error('Download paused; choose Resume to continue');
            }
            if (result.status !== 200 && result.status !== 206)
                throw Error(`Download failed (${result.status})`);
            await d.runAsync('UPDATE downloads SET status=? WHERE hash=?', 'verifying', hash);
            notify();
            const f = new File(partial);
            if (!f.exists || f.size !== asset.bytes || await hashFile(f.uri) !== hash) {
                if (f.exists)
                    f.delete();
                throw Error('Downloaded recording failed verification');
            }
            const finalPath = save || keepRequests.has(hash) ? new File(dir(),`${hash}.audio`).uri : path;
            const target = new File(finalPath);
            if (target.exists)
                target.delete();
            f.move(target);
            await d.runAsync('UPDATE downloads SET status=?,resume=NULL,error=NULL WHERE hash=?', 'ready', hash);
            if(finalPath!==path)await d.runAsync('UPDATE downloads SET path=? WHERE hash=?',finalPath,hash);
            await rememberTrack(track,save || keepRequests.has(hash));
            return finalPath;
        }
        catch (error) {
            if (!pauseReason)
                await d.runAsync('UPDATE downloads SET status=?,error=?,resume=NULL WHERE hash=?', 'failed', String(error), hash);
            throw error;
        }
        finally {
            active = null; activeTrackId=null;
            acquisitionViews.delete(hash);
            notify();
        }
    });
    jobs.set(hash, job);
    tail = job.then(() => undefined, () => undefined);
    void job.finally(() => jobs.delete(hash)).catch(() => undefined);
    return job;
}
export async function cancelMusicDownload() {
    if(Platform.OS==='android' && native?.cancelAcquisition)for(const hash of jobs.keys())await native.cancelAcquisition(hash);
    if (active) {
    pauseReason = 'cancel';
    await active.pauseAsync();
} }
export async function removeDownloadedTrack(trackId: string) {
    await initializeMusicDownloads();
    const d = await db();
    for (const r of await d.getAllAsync<Row>('SELECT * FROM downloads WHERE track=?', trackId)) {
        if(jobs.has(r.hash))throw Error('Download is still running');
        if (pins.has(r.path) || await native?.isPinned(r.path))
            throw Error('This recording is in use. Stop music before deleting it.');
        if(Platform.OS==='android' && native?.removeAcquisition)await native.removeAcquisition(r.hash);
        for (const p of [r.path, `${r.path}.partial`]) {
            const f = new File(p);
            if (f.exists)
                f.delete();
        }
        await d.runAsync('DELETE FROM downloads WHERE hash=?', r.hash);
        await d.runAsync('DELETE FROM music_download_tracks WHERE hash=?',r.hash);
        acquisitionViews.delete(r.hash);keepRequests.delete(r.hash);
    }
    notify();
}
export async function getDownloadedTrackIds() { return (await readDownloadedMusic()).map(track=>track.id); }
export async function getMusicCacheSizeBytes() { return (await readMusicDownloads()).reduce((n, r) => n + r.bytes, 0); }
export async function clearMusicCache(){
  const failures:string[]=[];
  for(const id of [...new Set((await readMusicDownloads()).map(row=>row.track))]){
    try{await removeDownloadedTrack(id);}catch(error){failures.push(String(error));}
  }
  if(failures.length)throw Error(`${failures.length} music download(s) could not be removed. ${failures[0]}`);
}

/** Candidates are used only by the Android service, which hashes local audio again before playing it. */
export async function resolveNativeQueueSource(track:MusicTrack):Promise<string>{
  if(track.availability!=='available')throw Error('This recording is coming soon');
  if(track.bundledId==='gita-10-20-hi')return 'asset:///geeta-10-20-hi.mp3';
  if(!track.asset)throw Error('No verified audio source');
  await initializeMusicDownloads();
  const row=await(await db()).getFirstAsync<Row>('SELECT * FROM downloads WHERE hash=? AND status=?',track.asset.sha256,'ready');
  if(row){const file=new File(row.path);if(file.exists&&file.size===row.bytes)return row.path;await quarantine(row);}
  if(native?.localAcquisition){const local=await native.localAcquisition(track.asset.sha256);if(local)return local;}
  return track.asset.url;
}

export async function quarantineMusicAsset(hash:string,message:string){
  await(await db()).runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?','failed',message,hash);notify();
}

async function evictTemporary(bytes: number, activePath: string) {
    const files=temporaryDir().list().filter((f): f is File => f instanceof File).sort((a,b)=>(a.modificationTime??0)-(b.modificationTime??0));
    let used=files.reduce((n,f)=>n+f.size,0);
    for(const file of files) {
        if(used+bytes<=256*1024*1024)break;
        if(file.uri!==activePath && file.uri!==`${activePath}.partial` && !pins.has(file.uri)) { const size=file.size;file.delete();used-=size; }
    }
    if(used+bytes>256*1024*1024)throw Error('Not enough temporary music storage');
}
