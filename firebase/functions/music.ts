import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseMusicReleaseV2, legacyMusicRelease, migrateMusicRelease, type MusicReleaseV2, type MusicImage } from '../../shared/music-presentation';
import { MUSIC_MAX_BYTES, MUSIC_MAX_DURATION, musicId, parseMusicAsset, parseMusicRelease, type MusicAsset, type MusicRelease } from '../../shared/music';
const db = () => getFirestore(), bucket = () => getStorage().bucket();
class Conflict extends Error {
}
export async function validateMusicUpload(actor: string, path: unknown): Promise<MusicAsset> {
    if (typeof path !== 'string' || !path.startsWith(`music/uploads/${actor}/`) || !/^music\/uploads\/[^/]+\/[\w-]+\.(mp3|m4a)$/.test(path))
        throw Error('Invalid upload owner or path');
    const source = bucket().file(path), [meta] = await source.getMetadata();
    const size = Number(meta.size);
    if (!Number.isSafeInteger(size) || size < 1 || size > MUSIC_MAX_BYTES)
        throw Error('Music uploads must be at most 200 MB');
    const generation = String(meta.generation), exact = bucket().file(path, { generation });
    const temp = await mkdtemp(join(tmpdir(), 'music-'));
    const file = join(temp, 'recording');
    const digest = createHash('sha256');
    let bytes = 0;
    try {
        await pipeline(exact.createReadStream(), new Transform({ transform(chunk, _, callback) { bytes += chunk.length; if (bytes > MUSIC_MAX_BYTES)
                callback(Error('Upload exceeds 200 MB'));
            else {
                digest.update(chunk);
                callback(null, chunk);
            } } }), createWriteStream(file));
        if (bytes !== size)
            throw Error('Upload changed during validation');
        const { parseFile } = await import('music-metadata');
        const measured = await parseFile(file, { duration: true, skipCovers: true });
        const codec = measured.format.codec ?? '', container = measured.format.container ?? '';
        const mime = /mpeg/i.test(container) && /layer 3/i.test(codec) ? 'audio/mpeg' : /m4a|mp4/i.test(container) && /aac/i.test(codec) ? 'audio/mp4' : null;
        if (!mime || measured.format.hasVideo || !measured.format.duration || measured.format.duration * 1000 > MUSIC_MAX_DURATION)
            throw Error('Valid MP3 or AAC/M4A audio up to three hours required');
        const id = randomUUID(), sha256 = digest.digest('hex'), target = bucket().file(`music/validated/${id}.audio`);
        // Read and copy the exact generation validated above. Destination is write-once.
        await exact.copy(target, { preconditionOpts: { ifGenerationMatch: 0 } });
        const [copied] = await target.getMetadata();
        const asset = parseMusicAsset({ id, sha256, bytes, mime, durationMs: Math.round(measured.format.duration * 1000), url: `https://storage.googleapis.com/${bucket().name}/${encodeURIComponent(target.name)}` });
        await db().doc(`musicAssets/${id}`).create({ asset, path: target.name, generation: String(copied.generation), actor, sourceGeneration: generation, validatedAt: new Date().toISOString() });
        return asset;
    }
    finally {
        await rm(temp, { recursive: true, force: true });
    }
}
async function publishAsset(input: MusicAsset, actor: string): Promise<MusicAsset> {
    const stored = (await db().doc(`musicAssets/${musicId(input.id)}`).get()).data();
    if (!stored)
        throw Error('Asset has not been validated');
    const verified = parseMusicAsset(stored.asset);
    for (const k of ['id', 'sha256', 'bytes', 'mime', 'durationMs'] as const)
        if (verified[k] !== input[k])
            throw Error('Validated asset metadata changed');
    // A previously published asset may be reused by another verified admin.
    if (stored.actor !== actor && !stored.published)
        throw Error('Upload belongs to another administrator');
    const target = bucket().file(`music/published/${input.id}.audio`);
    if (!(await target.exists())[0]) {
        await bucket().file(stored.path, { generation: stored.generation }).copy(target, { preconditionOpts: { ifGenerationMatch: 0 } }).catch(async (error) => { if (!(await target.exists())[0])
            throw error; });
    }
    const [meta] = await target.getMetadata();
    let token = meta.metadata?.firebaseStorageDownloadTokens;
    if (!token) {
        token = input.id;
        await target.setMetadata({ contentType: verified.mime, cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: token } });
    }
    await db().doc(`musicAssets/${input.id}`).update({ published: true });
    return { ...verified, url: `https://firebasestorage.googleapis.com/v0/b/${bucket().name}/o/${encodeURIComponent(target.name)}?alt=media&token=${token}` };
}
export async function publishMusic(actor: string, value: unknown, expectedReleaseId: unknown, restoredFrom?: string) {
    const parsed = parseMusicReleaseV2(value);
    await verifyImages(parsed);
    for (const track of parsed.tracks)
        if (track.asset)
            track.asset = await publishAsset(track.asset, actor);
    const releaseId = randomUUID(), publishedAt = new Date().toISOString();
    const release = JSON.parse(JSON.stringify({ ...parsed, releaseId, publishedAt, actor, ...(restoredFrom ? { restoredFrom } : {}) }));
    if (Buffer.byteLength(JSON.stringify(release)) > 900000)
        throw Error('Catalog exceeds release size limit');
    await db().runTransaction(async (tx) => { const ref = db().doc('musicDelivery/current'), current = await tx.get(ref); if ((current.data()?.releaseId ?? null) !== expectedReleaseId)
        throw new Conflict('Another admin published first. Reload and review changes.'); tx.create(db().doc(`musicReleases/${releaseId}`), JSON.parse(JSON.stringify({ ...legacyMusicRelease(parsed), releaseId, publishedAt, actor, ...(restoredFrom ? { restoredFrom } : {}) }))); tx.create(db().doc(`musicPageReleases/${releaseId}`), release); tx.set(ref, { releaseId, updatedAt: publishedAt, actor, pageVersion: (value as { schemaVersion?: number }).schemaVersion === 2 ? 2 : 1 }); tx.set(db().doc(`musicDrafts/${actor}`), { catalog: release, actor, updatedAt: publishedAt }); });
    return { releaseId, publishedAt };
}
/** Dedicated instance limits bound temporary disk use for long recordings. */
export const musicApi = onRequest({ region: 'asia-south1', cors: true, memory: '1GiB', timeoutSeconds: 540, concurrency: 1, maxInstances: 3 }, async (req, res) => {
    try {
        const path = req.path;
        if (req.method === 'GET' && (path.endsWith('/catalog') || path.endsWith('/catalog-v2'))) {
            const current = (await db().doc('musicDelivery/current').get()).data();
            const release = current?.releaseId ? (await db().doc(`musicReleases/${current.releaseId}`).get()).data() as MusicRelease : undefined;
            if (!release) {
                res.status(503).json({ error: 'No music release published' });
                return;
            }
            const page = path.endsWith('/catalog-v2') ? (await db().doc(`musicPageReleases/${current!.releaseId}`).get()).data() : null;
            const publicRelease = path.endsWith('/catalog-v2') ? parseMusicReleaseV2(page ?? release) : parseMusicRelease(release), tag = `"${createHash('sha256').update(JSON.stringify(publicRelease)).digest('hex')}"`;
            res.set('ETag', tag).set('Cache-Control', 'public,max-age=300');
            if (req.headers['if-none-match'] === tag) {
                res.status(304).end();
                return;
            }
            res.json(publicRelease);
            return;
        }
        let actor: string;
        try {
            const token = await getAuth().verifyIdToken((req.headers.authorization ?? '').replace(/^Bearer /, ''), true);
            if (token.admin !== true)
                throw Error();
            actor = token.uid;
        }
        catch {
            res.status(403).json({ error: 'Verified admin access required' });
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).end();
            return;
        }
        if (Buffer.byteLength(JSON.stringify(req.body)) > 950000) {
            res.status(413).end();
            return;
        }
        const input = req.body;
        if (path.endsWith('/admin/preview-release')) { const key = musicId(input.releaseId); const page = (await db().doc(`musicPageReleases/${key}`).get()).data() ?? (await db().doc(`musicReleases/${key}`).get()).data(); if (!page) throw Error('Publication no longer exists'); res.json(parseMusicReleaseV2(page)); return; }
        if (path.endsWith('/admin/recrop-image')) { const imageId = musicId(input.imageId), stored = (await db().doc(`musicImages/${imageId}`).get()).data(); if (!stored) throw Error('Artwork no longer exists'); const [buffer] = await bucket().file(`music/images/${imageId}/original.webp`).download(); res.json(await prepareMusicImage(actor, buffer, stored.image.name, input.crop)); return; }
        if (path.endsWith('/admin/validate-image')) { res.json(await validateMusicImage(actor, input.path, input.name, input.crop)); return; }
        if (path.endsWith('/admin/validate-asset')) {
            res.json(await validateMusicUpload(actor, input.path));
            return;
        }
        if (path.endsWith('/admin/load')) {
            const current = (await db().doc('musicDelivery/current').get()).data();
            const releases = (await db().collection('musicReleases').orderBy('publishedAt', 'desc').limit(30).get()).docs.map(d => ({ id: d.id, publishedAt: d.data().publishedAt, actor: d.data().actor }));
            const legacy = current?.releaseId ? (await db().doc(`musicReleases/${current.releaseId}`).get()).data() : null;
            const page = current?.releaseId ? (await db().doc(`musicPageReleases/${current.releaseId}`).get()).data() : null;
            const release = page ?? (legacy ? migrateMusicRelease(parseMusicRelease(legacy)) : null);
            const draft = (await db().doc(`musicDrafts/${actor}`).get()).data();
            res.json({ release, releaseId: current?.releaseId ?? null, releases, draft: draft?.catalog ?? null, draftUpdatedAt: draft?.updatedAt ?? null, media: (await db().collection('musicImages').orderBy('createdAt', 'desc').limit(200).get()).docs.map(d => d.data().image) });
            return;
        }
        if (path.endsWith('/admin/draft')) {
            if (input.editorVersion !== 2) { const current = (await db().doc('musicDelivery/current').get()).data(); if (current?.pageVersion === 2) throw new Conflict('The music editor has been updated. Reload this page before saving.'); }
            // Drafts can be incomplete; only publication requires all references and text.
            const catalog = input.catalog;
            if (catalog?.schemaVersion === 1) parseMusicRelease(catalog); else if (!catalog || catalog.schemaVersion !== 2 || !Array.isArray(catalog.tracks) || !Array.isArray(catalog.presentation?.sections)) throw Error('Invalid music page draft');
            await db().doc(`musicDrafts/${actor}`).set({ catalog: JSON.parse(JSON.stringify(catalog)), actor, updatedAt: new Date().toISOString() });
            res.json({ saved: true });
            return;
        }
        if (path.endsWith('/admin/publish')) {
            if (input.catalog?.schemaVersion !== 2) { const current = (await db().doc('musicDelivery/current').get()).data(); if (current?.pageVersion === 2) throw new Conflict('Reload the updated visual music editor before publishing.'); }
            const restoredFrom = input.restoredFrom ? musicId(input.restoredFrom) : undefined;
            if (restoredFrom && !(await db().doc(`musicReleases/${restoredFrom}`).get()).exists) throw Error('Restored publication no longer exists');
            res.json(await publishMusic(actor, input.catalog, input.expectedReleaseId ?? null, restoredFrom));
            return;
        }
        if (path.endsWith('/admin/restore')) {
            const id = musicId(input.restoreId), old = (await db().doc(`musicPageReleases/${id}`).get()).data() ?? (await db().doc(`musicReleases/${id}`).get()).data();
            if (!old)
                throw Error('Release does not exist');
            res.json(await publishMusic(actor, old, input.expectedReleaseId ?? null, id));
            return;
        }
        res.status(404).json({ error: 'Unknown music operation' });
    }
    catch (error) {
        res.status(error instanceof Conflict ? 409 : 400).json({ error: error instanceof Error ? error.message : 'Music operation failed' });
    }
});

async function verifyImages(release: MusicReleaseV2) {
    for (const image of release.media) {
        const stored = (await db().doc(`musicImages/${image.id}`).get()).data();
        if (!stored) throw Error(`Artwork ${image.name} has not been verified`);
        for (const key of ['id', 'width', 'height', 'thumbnail', 'square', 'banner', 'original'] as const)
            if (stored.image[key] !== image[key]) throw Error('Verified artwork cannot be changed; upload a new crop instead');
    }
}
export async function validateMusicImage(actor: string, path: unknown, name: unknown, cropInput: unknown): Promise<MusicImage> {
    if (typeof path !== 'string' || !new RegExp(`^music/image-uploads/${actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[\\w-]+\\.(jpg|jpeg|png|webp)$`).test(path)) throw Error('Invalid image upload owner');
    if (typeof name !== 'string' || !name.trim() || name.length > 200) throw Error('Choose an image name');
    const source = bucket().file(path), [meta] = await source.getMetadata();
    if (Number(meta.size) < 1 || Number(meta.size) > 10 * 1024 * 1024) throw Error('Images must be at most 10 MB');
    const [buffer] = await bucket().file(path, { generation: String(meta.generation) }).download();
    return prepareMusicImage(actor, buffer, name, cropInput);
}
async function prepareMusicImage(actor: string, buffer: Buffer, name: string, cropInput: unknown): Promise<MusicImage> {
    const { default: sharp } = await import('sharp');
    const options = { limitInputPixels: 40000000, failOn: 'warning' as const };
    const info = await sharp(buffer, options).metadata();
    if (!['jpeg', 'png', 'webp'].includes(info.format ?? '') || !info.width || !info.height || (info.pages ?? 1) !== 1) throw Error('Upload a static JPEG, PNG or WebP image');
    // Normalize orientation and strip EXIF before applying the reusable focal-point crop.
    const normalized = await sharp(buffer, options).rotate().toBuffer();
    const dimensions = await sharp(normalized, options).metadata();
    const width = dimensions.width!, height = dimensions.height!;
    const crop = cropInput as { x?: number; y?: number } | null;
    const x = crop?.x ?? 50, y = crop?.y ?? 50;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) throw Error('Invalid image focal point');
    const imageId = randomUUID();
    const save = async (variant: string, data: Buffer) => {
        const file = bucket().file(`music/images/${imageId}/${variant}.webp`);
        await file.save(data, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: imageId } } });
        return `https://firebasestorage.googleapis.com/v0/b/${bucket().name}/o/${encodeURIComponent(file.name)}?alt=media&token=${imageId}`;
    };
    const derivative = async (w: number, h: number) => {
        const ratio = w / h, cw = Math.min(width, Math.round(height * ratio)), ch = Math.min(height, Math.round(width / ratio));
        const left = Math.round((width - cw) * x / 100), top = Math.round((height - ch) * y / 100);
        return sharp(normalized, options).extract({ left, top, width: Math.max(1, cw), height: Math.max(1, ch) }).resize(w, h, { fit: 'fill', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    };
    const image: MusicImage = { id: imageId, name, alt: { en: name }, width, height,
        original: await save('original', await sharp(normalized, options).webp({ quality: 90 }).toBuffer()),
        thumbnail: await save('thumbnail', await derivative(320, 320)), square: await save('square', await derivative(1024, 1024)), banner: await save('banner', await derivative(1600, 800)) };
    await db().doc(`musicImages/${imageId}`).create({ image, actor, createdAt: new Date().toISOString() });
    return image;
}
