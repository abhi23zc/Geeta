import { SeekController, waitForSeek } from './seek-controller';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { emptySnapshot, librarySnapshot, successor, traversal, speeds, type PlaybackAdapter, type PlaybackSnapshot, type QueueEntry } from './model';
import { musicAudioMode } from './ownership';
import { resolveMusicSource, pinMusicFile } from '../music-downloads';
import type { RepeatMode, SleepTimerOption } from '@/types/music';
/** iOS/web timers require a running JS runtime. Android never instantiates this engine. */
export class ExpoMusicAdapter implements PlaybackAdapter {
    private s = emptySnapshot();
    private libraryS=this.s;
    private playedEntries=new Set<string>();
    private listeners = new Set<() => void>();
    private player: AudioPlayer | null = null;
    private sourceUri: string | null = null;
    private generation = 0;
    private pausedByUser = false;
    private transportVersion = 0;
    private lastProgressAt = performance.now();
    private lastPosition = 0;
    private seeks = new SeekController((target, error) => { this.lastProgressAt = performance.now();if (error) { this.pausedByUser = true; this.player?.pause(); } this.update({ seeking: target !== null, seekTargetMs: target, ...(target !== null ? { positionMs: target } : {}), ...(error ? { state: 'failed' as const, error: String(error) } : {}) }); });
    private removeStatus?: () => void;
    private owner = 'none';
    private deadline: number | null = null;
    private interval = setInterval(() => this.tick(), 500);
    private available = new Set<string>();
    private catalogKnown = false;
    private disposed = false;
    private unpin?: () => void;
    whenReady = () => Promise.resolve();
    getSnapshot = () => this.s;
    getLibrarySnapshot=()=>this.libraryS;
    subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
    private update(p: Partial<PlaybackSnapshot>) { this.s = { ...this.s, ...p };this.libraryS=librarySnapshot(this.libraryS,this.s); this.listeners.forEach(l => l()); }
    private invalidate() { this.transportVersion++;this.seeks.cancel();this.generation++; this.player?.pause(); }
    private release() { this.unpin?.(); this.unpin = undefined; this.removeStatus?.(); this.removeStatus = undefined; this.player?.setActiveForLockScreen(false); this.player?.remove(); this.player = null;this.sourceUri = null; }
    async replaceQueue(queue: QueueEntry[], entryId: string, play = true) { this.invalidate(); this.release(); this.playedEntries.clear(); const playable = queue.filter(e => e.track.availability === 'available'); this.update({ queue: playable, order: traversal(playable, entryId, this.s.shuffle), history: [], entryId, excluded: queue.length - playable.length, positionMs: 0, error: null }); await this.load(entryId, play); }
    private async load(id: string, play = true, positionMs = 0) {
        this.lastProgressAt = performance.now();this.lastPosition = 0;
        this.transportVersion++;this.seeks.cancel();this.pausedByUser = !play;
        const g = ++this.generation;
        this.release();
        const e = this.s.queue.find(e => e.entryId === id);
        if (!e || e.track.availability !== 'available') {
            this.update({ state: 'failed', error: 'This recording is coming soon' });
            return;
        }
        this.update({ entryId: id, state: 'loading', positionMs, durationMs: e.track.durationMs, seekable: false, bufferedPositionMs: 0, error: null });
        try {
            const source = await resolveMusicSource(e.track);
            if (g !== this.generation || this.disposed)
                return;
            await musicAudioMode(true);
            if (g !== this.generation || this.disposed)
                return;
            if (typeof source !== 'number' && source.uri.startsWith('file:'))
                this.unpin = pinMusicFile(source.uri);
            const p = createAudioPlayer(source, { updateInterval: 250 });
            this.player = p;
            this.sourceUri = typeof source === 'number' ? null : source.uri;
            p.playbackRate = this.s.speed;
            const subscription = p.addListener('playbackStatusUpdate', status => {
                if (g !== this.generation || this.s.state === 'failed')
                    return;
                if (status.currentTime !== this.lastPosition || this.pausedByUser || this.s.seeking) this.lastProgressAt = performance.now();
                this.lastPosition = status.currentTime;
                if(status.playing)this.playedEntries.add(id);
                if (!this.s.seeking && this.s.state === 'playing' && !status.playing && status.isLoaded && !status.isBuffering && !status.didJustFinish && !status.error) {
                    this.pause('audio-focus');
                    return;
                }
                this.update({ positionMs: status.error || (this.pausedByUser && this.s.state === 'loading') ? this.s.positionMs : this.s.seekTargetMs ?? Math.round(status.currentTime * 1000), seekable: status.isLoaded && status.duration > 0, durationMs: Math.round(status.duration * 1000) || e.track.durationMs, buffering: status.isBuffering, state: status.error ? 'failed' : this.pausedByUser ? 'paused' : status.playing || (status.isBuffering && this.s.state === 'playing') ? 'playing' : status.isLoaded ? 'paused' : 'loading', error: status.error ?? null });
                if (status.didJustFinish && !this.s.seeking)
                    void this.complete(g);
            });
            this.removeStatus = () => subscription.remove();
            if (play && this.owner === 'none') {
                p.setActiveForLockScreen(true, { title: e.track.title, artist: e.track.artist });
                p.play();
            }
        }
        catch (error) {
            if (g === this.generation)
                this.update({ state: 'failed', error: error instanceof Error ? error.message : 'Playback failed' });
        }
    }
    private async complete(g: number) { if (g !== this.generation)
        return; const allowed = !this.catalogKnown || this.available.has(this.s.queue.find(e => e.entryId === this.s.entryId)?.track.id ?? ''); const next = successor(allowed ? this.s : { ...this.s, repeat: this.s.repeat === 'one' ? 'off' : this.s.repeat }, true); if (this.s.timer === 'end-of-track')
        this.setTimer(null); if (next) {
        this.update({ history: this.s.entryId&&this.playedEntries.has(this.s.entryId)?[...this.s.history,this.s.entryId]:this.s.history });
        await this.load(next);
    }
    else {
        this.invalidate();
        this.update({ state: 'completed', buffering: false });
    } }
    async selectEntry(id: string) {
        if (this.owner !== 'none' || !this.s.queue.some(e => e.entryId === id && e.track.availability === 'available') || (this.catalogKnown && !this.available.has(this.s.queue.find(e => e.entryId === id)!.track.id))) return;
        if (id === this.s.entryId) { if (this.s.state !== 'playing' && this.s.state !== 'loading') await this.play(); return; }
        this.update({ history: this.s.entryId && this.playedEntries.has(this.s.entryId) ? [...this.s.history, this.s.entryId] : this.s.history });
        await this.load(id);
    }
    async play() {
        if (this.owner !== 'none') {
            this.update({ interruption: this.owner });
            return;
        }
        if (this.s.state === 'completed' && this.catalogKnown && !this.available.has(this.s.queue.find(e => e.entryId === this.s.entryId)?.track.id ?? '')) {
            this.update({ error: 'This recording is coming soon' });
            return;
        }
        const position = this.s.state === 'completed' ? 0 : this.s.positionMs;
        if (this.player && this.s.state !== 'failed' && this.s.state !== 'completed') {
            const transport = this.transportVersion;
            if (this.sourceUri?.startsWith('https:')) await this.seek(position);
            if (transport !== this.transportVersion || this.owner !== 'none' || !this.player) return;
            this.lastProgressAt = performance.now();
            this.pausedByUser = false;
            const track = this.s.queue.find(e => e.entryId === this.s.entryId)?.track;
            if (track) this.player.setActiveForLockScreen(true, { title: track.title, artist: track.artist });
            this.player.play();
            this.update({ state: 'playing', interruption: null });
            return;
        }
        if (!this.player || this.s.state !== 'playing') {
            const transport = this.transportVersion + 1;
            const g = this.generation + 1;
            await this.load(this.s.entryId ?? '', false, position);
            if (g !== this.generation || transport !== this.transportVersion) return;
            await this.seek(position);
            if (g !== this.generation || transport !== this.transportVersion || this.owner !== 'none')
                return;
            this.lastProgressAt = performance.now();
            this.pausedByUser = false;
            const track = this.s.queue.find(e => e.entryId === this.s.entryId)?.track;
            if (track) this.player?.setActiveForLockScreen(true, { title: track.title, artist: track.artist });
            this.player?.play();
            this.update({ interruption: null });
        }
    }
    pause(reason = 'user') {
        this.transportVersion++;
        this.seeks.cancel();
        this.pausedByUser = true;
        if (this.player) this.player.pause();
        else this.generation++; // Cancel source resolution without discarding a loaded player.
        this.update({ state: 'paused', interruption: reason, buffering: false });
    }
    stop() { this.invalidate(); this.release(); this.setTimer(null); this.update({ ...emptySnapshot(), speed: this.s.speed, repeat: this.s.repeat, shuffle: this.s.shuffle }); }
    async seek(ms: number) {
        const target = Math.max(0, Math.min(this.s.durationMs, Number.isFinite(ms) ? ms : 0));
        const player = this.player, g = this.generation;
        if (!player || this.s.durationMs <= 0) return;
        return this.seeks.request(target, async (position, valid) => {
            const deadline = performance.now() + 15000;
            const transport = this.transportVersion;
            let swapped = false;
            if (this.sourceUri?.startsWith('https:')) {
                const entry = this.s.queue.find(e => e.entryId === this.s.entryId);
                if (entry) {
                    const source = await resolveMusicSource(entry.track);
                    if (!valid() || g !== this.generation) return;
                    if (typeof source !== 'number' && source.uri.startsWith('file:')) {
                        this.unpin?.();this.unpin = pinMusicFile(source.uri);
                        player.replace(source);this.sourceUri = source.uri;swapped = true;
                    }
                }
            }
            await waitForSeek(() => valid() && g === this.generation && !this.disposed, () => player.isLoaded !== false, deadline);
            if (!valid() || g !== this.generation) return;
            let settled = false, failure: unknown;
            void player.seekTo(position / 1000).then(() => { settled = true; }, error => { failure = error; settled = true; });
            // A superseded seek must finish before the next command reaches this same player.
            await waitForSeek(() => g === this.generation && !this.disposed, () => { if (failure) throw failure; return settled; }, deadline);
            await waitForSeek(() => valid() && g === this.generation, () => Math.abs(player.currentTime * 1000 - position) < 1000, deadline);
            if (swapped && valid() && g === this.generation) {
                player.playbackRate = this.s.speed;
                if (!this.pausedByUser && this.owner === 'none' && transport === this.transportVersion) player.play();
            }
        });
    }
    async next() { const id = successor(this.s); if (id) {
        this.update({ history: this.s.entryId&&this.playedEntries.has(this.s.entryId)?[...this.s.history,this.s.entryId]:this.s.history });
        await this.load(id);
    }
    else
        this.pause(); }
    async previous() { if (this.s.positionMs > 3000)
        return this.seek(0); const h = this.s.history.filter(id => !this.catalogKnown || this.available.has(this.s.queue.find(e => e.entryId === id)?.track.id ?? '')), id = h.pop() ?? (this.s.repeat === 'all' ? this.s.order.at(-1) : undefined); if (id) {
        this.update({ history: h });
        await this.load(id);
    }
    else
        await this.seek(0); }
    setSpeed(speed: number) { if (!speeds.includes(speed))
        return; this.update({ speed }); if (this.player)
        this.player.playbackRate = speed; }
    setShuffle(shuffle: boolean) { this.update({ shuffle, order: traversal(this.s.queue.filter(e => !this.catalogKnown || this.available.has(e.track.id)), this.s.entryId, shuffle) }); }
    setRepeat(repeat: RepeatMode) { this.update({ repeat }); }
    setTimer(timer: SleepTimerOption) { this.deadline = typeof timer === 'number' ? performance.now() + timer * 60000 : null; this.update({ timer, remainingMs: typeof timer === 'number' ? timer * 60000 : null }); }
    private tick() {
        if (this.player && !this.pausedByUser && !this.s.seeking && this.s.state !== 'failed' && this.s.state !== 'completed' && performance.now() - this.lastProgressAt >= 15000) {
            this.player.pause();
            this.update({ state: 'failed', buffering: false, error: 'Playback is taking too long. Retry to continue from this position.' });
        }
        if (this.deadline === null)
        return; const remainingMs = Math.max(0, this.deadline - performance.now()); if (!remainingMs) {
        this.setTimer(null);
        this.pause('sleep');
    }
    else
        this.update({ remainingMs }); }
    setOwner(owner: 'none' | 'ritual' | 'alarm') { this.owner = owner; if (owner !== 'none')
        this.pause(owner); }
    updateCatalog(tracks: QueueEntry['track'][], enabled: boolean) { this.catalogKnown = true; this.available = new Set(tracks.filter(t => enabled && t.availability === 'available').map(t => t.id)); const queue = this.s.queue.map(e => e.entryId === this.s.entryId ? e : { ...e, track: tracks.find(t => t.id === e.track.id) ?? { ...e.track, availability: 'comingSoon' as const } }); this.update({ queue, order: this.s.order.filter(id => queue.some(e => e.entryId === id && this.available.has(e.track.id))) }); }
    dispose() { this.disposed = true; this.invalidate(); this.release(); clearInterval(this.interval); this.listeners.clear(); }
}
