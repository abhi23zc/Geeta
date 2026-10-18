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
let wifiOnly = true;
let catalogKnown=false, catalogEnabled=true, activeTrackId:string|null=null;
let catalogTracks=new Map<string,MusicTrack>();
let reservationTail=Promise.resolve();
export function setMusicDownloadCatalog(tracks:MusicTrack[],enabled:boolean){
  catalogKnown=true;catalogEnabled=enabled;catalogTracks=new Map(tracks.map(t=>[t.id,t]));
  if(active && activeTrackId && (!enabled || catalogTracks.get(activeTrackId)?.availability!=='available')){pauseReason='catalog';void active.pauseAsync().catch(()=>undefined);}
}
function checkCatalog(track:MusicTrack){
  if(!catalogKnown)return;
  const latest=catalogTracks.get(track.id);
  if(!catalogEnabled || latest?.availability!=='available')throw Error('This recording is coming soon');
  if(latest.asset?.sha256!==track.asset?.sha256)throw Error('Recording updated. Select it again before downloading.');
}
async function reserve(track:MusicTrack,asset:NonNullable<MusicTrack['asset']>){
  await initializeMusicDownloads();checkCatalog(track);
  const d=await db(),hash=asset.sha256,path=new File(dir(),`${hash}.audio`).uri;
  const old=await d.getFirstAsync<Row>('SELECT * FROM downloads WHERE hash=?',hash);
  if(old?.status==='ready'&&await verified(old))return {d,path,old,ready:true};
  if(pins.has(path)||await native?.isPinned(path))throw Error('Stop music before redownloading this recording.');
  await d.withExclusiveTransactionAsync(async tx=>{
    const total=await tx.getFirstAsync<{n:number}>('SELECT COALESCE(SUM(bytes),0) n FROM downloads WHERE hash<>?',hash);
    if((total?.n??0)+asset.bytes>MUSIC_BUDGET)throw Error('Music storage is full. Delete downloads to make space.');
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
        wifiOnly = (await d.getFirstAsync<{
            value: string;
        }>('SELECT value FROM music_settings WHERE key=?', 'wifiOnly'))?.value !== 'false';
        const rows = await d.getAllAsync<Row>('SELECT * FROM downloads');
        for (const row of rows) {
            const f = new File(row.path);
            if (row.status === 'ready' && (!f.exists || f.size !== row.bytes))
                await d.runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?', 'failed', 'Downloaded file is missing or damaged', row.hash);
            else if (['downloading', 'verifying', 'queued'].includes(row.status))
                await d.runAsync('UPDATE downloads SET status=? WHERE hash=?', 'paused', row.hash);
        }
        const known = new Set(rows.flatMap(r => [r.path, `${r.path}.partial`]));
        for (const f of dir().list())
            if (f instanceof File && !known.has(f.uri))
                f.delete();
        // Legacy files and data remain intact for recovery; size-only verification is never imported.
        Network.addNetworkStateListener(() => { void enforcePolicy(); });
        AppState.addEventListener('change', () => { void enforcePolicy(); });
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
    if (track.availability !== 'available')
        return Promise.reject(Error('Coming soon'));
    if (!track.asset)
        return Promise.reject(Error('This recording is included with the app'));
    if (Platform.OS === 'web')
        return Promise.reject(Error('Music downloads are available in the mobile app.'));
    const asset = parseMusicAsset(track.asset), hash = asset.sha256;
    if (jobs.has(hash))
        return jobs.get(hash)!;
    try{checkCatalog(track);}catch(error){return Promise.reject(error);}
    const reservation=reservationTail.catch(()=>undefined).then(()=>reserve(track,asset));
    reservationTail=reservation.then(()=>undefined,()=>undefined);
    // Reserve and expose Queued immediately, while network transfers remain serialized.
    const job=tail.catch(()=>undefined).then(async()=>{
        const {d,path,old,ready}=await reservation;
        if(ready)return path;
        try{checkCatalog(track);}catch(error){await d.runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?','failed',String(error),hash);notify();throw error;}
        if (!await allowed()) {
            await d.runAsync('UPDATE downloads SET status=? WHERE hash=?', 'paused', hash);
            notify();
            throw Error('Download paused. Open the app on an allowed network and choose Resume.');
        }
        pauseReason = null; activeTrackId=track.id;
        const partial = `${path}.partial`;
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
            active = FS.createDownloadResumable(asset.url, partial, {}, p => { onProgress?.(Math.min(1, p.totalBytesWritten / asset.bytes)); if (p.totalBytesWritten > asset.bytes) {
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
            const target = new File(path);
            if (target.exists)
                target.delete();
            f.move(target);
            await d.runAsync('UPDATE downloads SET status=?,resume=NULL,error=NULL WHERE hash=?', 'ready', hash);
            return path;
        }
        catch (error) {
            if (!pauseReason)
                await d.runAsync('UPDATE downloads SET status=?,error=?,resume=NULL WHERE hash=?', 'failed', String(error), hash);
            throw error;
        }
        finally {
            active = null; activeTrackId=null;
            notify();
        }
    });
    jobs.set(hash, job);
    tail = job.then(() => undefined, () => undefined);
    void job.finally(() => jobs.delete(hash)).catch(() => undefined);
    return job;
}
export async function cancelMusicDownload() { if (active) {
    pauseReason = 'cancel';
    await active.pauseAsync();
} }
export async function removeDownloadedTrack(trackId: string) {
    await initializeMusicDownloads();
    if (jobs.size)
        throw Error('Wait for the current transfer to finish or pause');
    const d = await db();
    for (const r of await d.getAllAsync<Row>('SELECT * FROM downloads WHERE track=?', trackId)) {
        if (pins.has(r.path) || await native?.isPinned(r.path))
            throw Error('This recording is in use. Stop music before deleting it.');
        for (const p of [r.path, `${r.path}.partial`]) {
            const f = new File(p);
            if (f.exists)
                f.delete();
        }
        await d.runAsync('DELETE FROM downloads WHERE hash=?', r.hash);
    }
    notify();
}
export async function getDownloadedTrackIds() { return [...new Set((await readMusicDownloads()).filter(r => r.status === 'ready').map(r => r.track))]; }
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
  return track.asset.url;
}

export async function quarantineMusicAsset(hash:string,message:string){
  await(await db()).runAsync('UPDATE downloads SET status=?,error=? WHERE hash=?','failed',message,hash);notify();
}
