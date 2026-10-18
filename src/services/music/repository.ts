import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaybackSnapshot } from './model';
const key = '@aarambh_music_repository_v2';
export type MusicRepository = {
    version: 2;
    favorites: string[];
    recents: string[];
    session: PlaybackSnapshot | null;
};
const blank = (): MusicRepository => ({ version: 2, favorites: [], recents: [], session: null });
const ids = (v: unknown): string[] => { if (!Array.isArray(v) || v.length > 10000 || v.some(x => typeof x !== 'string' || !/^[\w-]{1,128}$/.test(x)))
    throw Error('Invalid saved music IDs'); return [...new Set(v)]; };
let tail = Promise.resolve();
async function readMusicRepositoryUnchecked(): Promise<MusicRepository> {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
        try {
            const r = JSON.parse(raw);
            if (r.version !== 2)
                throw Error('Unknown music repository');
            const result = { version: 2 as const, favorites: ids(r.favorites), recents: ids(r.recents), session: null as PlaybackSnapshot | null };
            if (r.session) {
                const s = r.session;
                if (!Array.isArray(s.queue) || s.queue.length > 1000 || s.queue.some((e: unknown) => { if (!e || typeof e !== 'object')
                    return true; const q = e as {
                    entryId?: unknown;
                    track?: {
                        id?: unknown;
                    };
                }; return typeof q.entryId !== 'string' || typeof q.track?.id !== 'string'; }) || !Number.isFinite(s.positionMs) || s.positionMs < 0 || typeof s.shuffle !== 'boolean' || ![.75, 1, 1.25, 1.5, 2].includes(s.speed) || !['off', 'all', 'one'].includes(s.repeat))
                    throw Error('Invalid saved session');
                result.session = s;
            }
            return result;
        }
        catch {
            await AsyncStorage.setItem(`${key}_recovery_${Date.now()}`, raw);
            return blank();
        }
    }
    const result = blank();
    for (const [legacy, field] of [['@aarambh_music_favorites_v1', 'favorites'], ['@aarambh_music_recently_played_v1', 'recents']] as const) {
        const raw = await AsyncStorage.getItem(legacy);
        if (raw) {
            try {
                result[field] = ids(JSON.parse(raw));
            }
            catch {
                await AsyncStorage.setItem(`${legacy}_recovery_${Date.now()}`, raw);
            }
        }
    }
    return result;
}
export function writeMusicRepository(value: MusicRepository) {
 const json=JSON.stringify(value);
 const next=tail.catch(()=>undefined).then(()=>AsyncStorage.setItem(key,json)).then(()=>{reportPersistenceError(null);},error=>{reportPersistenceError('Music settings could not be saved. Please retry.');throw error;});
 tail=next;return next;
}
/** Apply actions made during hydration to imported favorites instead of replacing user input. */
export function mergeMusicHydration(stored: MusicRepository, current: MusicRepository, toggles: string[], sessionTouched: boolean): MusicRepository {
    const favorites = new Set(stored.favorites);
    for (const id of toggles) {
        if (favorites.has(id))
            favorites.delete(id);
        else
            favorites.add(id);
    }
    return { version: 2, favorites: [...favorites], recents: [...new Set([...current.recents, ...stored.recents])].slice(0, 20), session: sessionTouched ? current.session : stored.session };
}

let persistenceError:string|null=null;
const errorListeners=new Set<()=>void>();
export const musicPersistenceError=()=>persistenceError;
export const subscribeMusicPersistence=(listener:()=>void)=>{errorListeners.add(listener);return()=>{errorListeners.delete(listener);};};
function reportPersistenceError(error:string|null){persistenceError=error;errorListeners.forEach(listener=>listener());}

export async function readMusicRepository():Promise<MusicRepository>{
 try{return await readMusicRepositoryUnchecked();}catch(error){reportPersistenceError('Music settings could not be loaded. Please restart the app to retry.');throw error;}
}
