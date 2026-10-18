/** Music releases are independent from daily practice and alarm releases. */
export const MUSIC_MAX_BYTES = 200 * 1024 * 1024;
export const MUSIC_BUDGET = 1024 * 1024 * 1024;
export const MUSIC_MAX_DURATION = 3 * 60 * 60 * 1000;
export type MusicAsset = {
    id: string;
    url: string;
    mime: 'audio/mpeg' | 'audio/mp4';
    bytes: number;
    sha256: string;
    durationMs: number;
};
export type MusicText = {
    title: string;
    subtitle?: string;
    artist?: string;
    album?: string;
};
export type MusicLyrics = {
    startMs: number;
    endMs: number;
    sanskrit?: string;
    transliteration?: string;
    translation?: string;
};
export type CatalogTrack = {
    id: string;
    revision: string;
    availability: 'available' | 'comingSoon';
    category: 'gita' | 'mantra' | 'raga' | 'flute' | 'pranayama' | 'soundscape';
    metadata: {
        en: MusicText;
        hi?: MusicText;
    };
    unavailableTranslations: ('hi')[];
    asset?: MusicAsset;
    bundledId?: string;
    artworkUrl?: string;
    lyrics?: MusicLyrics[];
    credits?: string;
    rightsConfirmed?: boolean;
    tags: string[];
};
export type MusicRelease = {
    schemaVersion: 1;
    releaseId: string;
    publishedAt: string;
    enabled: boolean;
    tracks: CatalogTrack[];
    playlists: {
        id: string;
        metadata: {
            en: MusicText;
            hi?: MusicText;
        };
        trackIds: string[];
    }[];
};
export const BUNDLED_GITA = { id: 'gita-10-20-hi', durationMs: 58968, bytes: 956975, sha256: '112fc03d8659c4f349be4ff5decd6a608d4d4e08fa8995a016ab28da9df488d5' };
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('Expected object'); return v as Record<string, unknown>; };
export const musicId = (v: unknown): string => { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(v))
    throw Error('Invalid music ID'); return v; };
function text(v: unknown, max = 500, optional = false): string | undefined { if (optional && v === undefined)
    return undefined; if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw Error('Invalid music text'); return v; }
function num(v: unknown, max: number) { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v <= 0 || v > max)
    throw Error('Invalid music measurement'); return v; }
function https(v: unknown) { const s = text(v, 2048)!; const u = new URL(s); if (u.protocol !== 'https:' || u.username || u.password)
    throw Error('HTTPS required'); return s; }
function metadata(v: unknown): {
    en: MusicText;
    hi?: MusicText;
} { const r = object(v); const parse = (v: unknown): MusicText => { const x = object(v); return { title: text(x.title)!, subtitle: text(x.subtitle, 500, true), artist: text(x.artist, 500, true), album: text(x.album, 500, true) }; }; return { en: parse(r.en), ...(r.hi === undefined ? {} : { hi: parse(r.hi) }) }; }
export function parseMusicAsset(v: unknown): MusicAsset { const x = object(v); if (x.mime !== 'audio/mpeg' && x.mime !== 'audio/mp4')
    throw Error('MP3 or AAC/M4A required'); if (typeof x.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(x.sha256))
    throw Error('Invalid checksum'); return { id: musicId(x.id), url: https(x.url), mime: x.mime, bytes: num(x.bytes, MUSIC_MAX_BYTES), sha256: x.sha256, durationMs: num(x.durationMs, MUSIC_MAX_DURATION) }; }
export function parseMusicRelease(v: unknown): MusicRelease {
    const x = object(v);
    if (x.schemaVersion !== 1 || typeof x.enabled !== 'boolean' || typeof x.publishedAt !== 'string' || !Number.isFinite(Date.parse(x.publishedAt)))
        throw Error('Invalid music release');
    if (!Array.isArray(x.tracks) || x.tracks.length > 500 || !Array.isArray(x.playlists) || x.playlists.length > 100)
        throw Error('Catalog too large');
    const ids = new Set<string>();
    const tracks = x.tracks.map((v): CatalogTrack => {
        const r = object(v), id = musicId(r.id);
        if (ids.has(id))
            throw Error('Duplicate track');
        ids.add(id);
        if (!['gita', 'mantra', 'raga', 'flute', 'pranayama', 'soundscape'].includes(String(r.category)))
            throw Error('Invalid category');
        if (r.availability !== 'available' && r.availability !== 'comingSoon')
            throw Error('Invalid availability');
        const m = metadata(r.metadata);
        if (!Array.isArray(r.unavailableTranslations) || JSON.stringify(r.unavailableTranslations) !== JSON.stringify(m.hi ? [] : ['hi']))
            throw Error('Declare missing translations');
        const result: CatalogTrack = { id, revision: musicId(r.revision), availability: r.availability, category: r.category as CatalogTrack['category'], metadata: m, unavailableTranslations: m.hi ? [] : ['hi'], tags: [] };
        if (!Array.isArray(r.tags) || r.tags.length > 30)
            throw Error('Invalid tags');
        result.tags = r.tags.map(v => text(v, 80)!);
        if (r.artworkUrl !== undefined)
            result.artworkUrl = https(r.artworkUrl);
        if (r.availability === 'comingSoon') {
            if (r.asset !== undefined || r.bundledId !== undefined || r.lyrics !== undefined || r.credits !== undefined || m.en.artist || m.hi?.artist || m.en.album || m.hi?.album)
                throw Error('Coming soon entries cannot carry audio, lyrics or credits');
            return result;
        }
        if (!!r.asset === !!r.bundledId)
            throw Error('Exactly one verified source required');
        if (r.bundledId !== undefined) {
            if (r.bundledId !== BUNDLED_GITA.id)
                throw Error('Unknown bundled audio');
            result.bundledId = BUNDLED_GITA.id;
        }
        else {
            result.asset = parseMusicAsset(r.asset);
            result.credits = text(r.credits, 2000)!;
            if (r.rightsConfirmed !== true)
                throw Error('Publishing rights confirmation required');
            result.rightsConfirmed = true;
        }
        const duration = result.asset?.durationMs ?? BUNDLED_GITA.durationMs;
        if (r.lyrics !== undefined) {
            if (!Array.isArray(r.lyrics) || r.lyrics.length > 3000)
                throw Error('Invalid lyrics');
            let end = 0;
            result.lyrics = r.lyrics.map(v => { const l = object(v); if (typeof l.startMs !== 'number' || l.startMs < end || !Number.isFinite(l.startMs))
                throw Error('Lyrics must be ordered'); const e = num(l.endMs, duration); if (e <= l.startMs)
                throw Error('Invalid lyric interval'); end = e; return { startMs: l.startMs, endMs: e, sanskrit: text(l.sanskrit, 2000, true), transliteration: text(l.transliteration, 2000, true), translation: text(l.translation, 2000, true) }; });
        }
        return result;
    });
    const assets=new Map<string,string>();
    for(const track of tracks){if(track.asset){const encoded=JSON.stringify(track.asset);const previous=assets.get(track.asset.id);if(previous&&previous!==encoded)throw Error('Conflicting immutable music asset');assets.set(track.asset.id,encoded);}}
    const playlists = x.playlists.map(v => { const r = object(v), id = musicId(r.id); if (!Array.isArray(r.trackIds) || r.trackIds.length > 1000 || r.trackIds.some(v => !ids.has(String(v))))
        throw Error('Unknown playlist track'); return { id, metadata: metadata(r.metadata), trackIds: r.trackIds as string[] }; });
    if (new Set(playlists.map(p => p.id)).size !== playlists.length)
        throw Error('Duplicate playlist');
    return { schemaVersion: 1, releaseId: musicId(x.releaseId), publishedAt: x.publishedAt, enabled: x.enabled, tracks, playlists };
}
