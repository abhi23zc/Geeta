import { requireOptionalNativeModule } from 'expo-modules-core';
import { emptySnapshot, librarySnapshot, successor, traversal, speeds, type PlaybackAdapter, type PlaybackSnapshot, type QueueEntry } from './model';
import { resolveNativeQueueSource, pinMusicFile, quarantineMusicAsset } from '../music-downloads';
import type { MusicTrack, RepeatMode, SleepTimerOption } from '@/types/music';
export class NativeMusicAdapter implements PlaybackAdapter {
    private native = requireOptionalNativeModule('MusicPlayback');
    private s = emptySnapshot();
    private libraryS=this.s;
    private listeners = new Set<() => void>();
    private generation = 0;
    private pendingPins=new Set<()=>void>();
    private excluded=0;
    private quarantined=new Set<string>();
    private invalidate(){this.generation++;for(const release of this.pendingPins)release();this.pendingPins.clear();}
    private subscription?: {
        remove(): void;
    };
    private disposed = false;
    private ready: Promise<void>;
    private catalog: MusicTrack[] = [];
    private enabled = true;
    private catalogGeneration = 0;
    private reconcileKey = '';
    private invalidation: number | null = null;
    private selectionOverride: string | null = null;
    constructor() { this.ready = this.initialize(); }
    private async initialize() { if (!this.native) {
        this.update({ state: 'failed', error: 'Native music service requires an updated Android build' });
        return;
    } this.subscription = this.native.addListener('snapshot', (s: PlaybackSnapshot) => { if (!this.disposed) {
        if(s.state==='failed'&&s.error?.includes('verification')){const hash=s.queue.find(e=>e.entryId===s.entryId)?.track.asset?.sha256;if(hash&&!this.quarantined.has(hash)){this.quarantined.add(hash);void quarantineMusicAsset(hash,s.error).catch(()=>undefined);}}
        const epoch = (s as PlaybackSnapshot & {
            invalidation?: number;
        }).invalidation;
        if (epoch !== undefined) {
            if (this.invalidation !== null && epoch !== this.invalidation && s.interruption !== 'queue-replacement')
                this.invalidate();
            this.invalidation = epoch;
        }
        if (this.selectionOverride && s.entryId !== this.selectionOverride) {
            this.update({ timer: s.timer, remainingMs: s.remainingMs, interruption: s.interruption, ...(s.interruption && s.interruption !== 'queue-replacement' ? { state: 'paused' as const } : {}) });
        }
        else {
            this.selectionOverride = null;
            this.update(s);
            void this.refreshUpcoming();
        }
    } }); await this.native.initialize(); const snapshot = await this.native.snapshot(); if (snapshot && !this.disposed)
        this.update(snapshot); }
    whenReady = () => this.ready;
    getSnapshot = () => this.s;
    getLibrarySnapshot=()=>this.libraryS;
    subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
    private update(s: Partial<PlaybackSnapshot>) { if (s.queue && JSON.stringify(s.queue) === JSON.stringify(this.s.queue))
        s = { ...s, queue: this.s.queue }; this.s = { ...this.s, ...s,excluded:this.excluded };this.libraryS=librarySnapshot(this.libraryS,this.s); this.listeners.forEach(l => l()); }
    private async command(name: string, value?: string) { await this.ready; if (!this.native)
        throw Error('Native music service unavailable'); await this.native.command(name, value ?? null); }
    async replaceQueue(queue: QueueEntry[], entryId: string, play = true) {
        this.invalidate();const g = this.generation;
        await this.ready;
        if (g !== this.generation)
            return;
        const valid = queue.filter(e => e.track.availability === 'available');
        this.selectionOverride = entryId;this.quarantined.clear();this.excluded=queue.length-valid.length;
        this.update({ queue: valid, order:traversal(valid,entryId,this.s.shuffle),history:[], positionMs:0,durationMs:valid.find(e=>e.entryId===entryId)?.track.durationMs??0,entryId, state: 'loading', error: null, excluded: queue.length - valid.length });
        const releases:(()=>void)[]=[];
        try {
            const epoch = await this.native.beginQueue();
            if (g !== this.generation)
                return;
            const resolved = [];
            for (const e of valid) {
                const uri=await resolveNativeQueueSource(e.track);
                if(g!==this.generation)return;
                if(uri.startsWith('file:')){const release=pinMusicFile(uri);releases.push(release);this.pendingPins.add(release);}
                resolved.push({ ...e, uri });
            }
            if (g === this.generation)
                await this.native.replaceQueue(JSON.stringify(resolved), entryId, play, epoch);
        }
        catch (error) {
            if (g === this.generation)
                this.update({ state: 'failed', error: String(error) });
        } finally {for(const release of releases){release();this.pendingPins.delete(release);}}
    }
    async play() { if ((this.s.state === 'failed' || this.selectionOverride) && this.s.entryId)
        return this.replaceQueue(this.s.queue, this.s.entryId); await this.command('play'); }
    pause(reason = 'user') { this.invalidate(); this.update({ state: 'paused', interruption: reason }); void this.command('pause', reason).catch(e => this.update({ error: String(e) })); }
    stop() { this.invalidate(); this.selectionOverride = null; void this.command('stop').catch(e => this.update({ error: String(e) })); }
    seek(ms: number) { return this.command('seek', String(Math.max(0, Math.min(this.s.durationMs, Number.isFinite(ms) ? ms : 0)))); }
    next() { if(this.selectionOverride){const id=successor(this.s);if(id)return this.replaceQueue(this.s.queue,id);this.pause();return Promise.resolve();}return this.command('next'); }
    previous() { return this.command('previous'); }
    setSpeed(rate: number) { if (speeds.includes(rate))
        void this.command('speed', String(rate)).catch(e => this.update({ error: String(e) })); }
    setShuffle(enabled: boolean) { void this.command('shuffle', String(enabled)).catch(e => this.update({ error: String(e) })); }
    setRepeat(mode: RepeatMode) { void this.command('repeat', mode).catch(e => this.update({ error: String(e) })); }
    setTimer(timer: SleepTimerOption) { void this.command('timer', timer === null ? undefined : String(timer)).catch(e => this.update({ error: String(e) })); }
    setOwner(owner: 'none' | 'ritual' | 'alarm') { if (owner !== 'none')
        this.pause(owner); void this.ready.then(() => this.native?.setOwner(owner)).catch(e => this.update({ error: String(e) })); }
    updateCatalog(tracks: MusicTrack[], enabled: boolean) { this.catalog = tracks; this.enabled = enabled; this.catalogGeneration++; this.reconcileKey = ''; void this.command('availability', JSON.stringify(tracks.filter(t => enabled && t.availability === 'available').map(t => t.id))).catch(e => this.update({ error: String(e) })); void this.refreshUpcoming(); }
    private async refreshUpcoming() {
        if (this.selectionOverride || !this.catalog.length || !this.s.queue.length)
            return;
        const key = JSON.stringify([this.catalogGeneration, this.s.entryId, this.s.queue.map(e => [e.entryId, e.track.revision])]);
        if (this.reconcileKey === key)
            return;
        this.reconcileKey = key;
        const g = this.catalogGeneration;
        try {
            const resolved = [];
            for (const e of this.s.queue) {
                if (e.entryId === this.s.entryId)
                    continue;
                const track = this.catalog.find(t => t.id === e.track.id && t.availability === 'available');
                if (!track || !this.enabled)
                    continue;
                const uri=await resolveNativeQueueSource(track);
                if(g!==this.catalogGeneration||this.disposed)return;
                resolved.push({ ...e, track, uri });
            }
            if (g === this.catalogGeneration && !this.disposed)
                await this.command('catalogQueue', JSON.stringify(resolved));
        }
        catch (e) {
            this.update({ error: String(e) });
        }
    }
    dispose() { this.disposed = true; this.invalidate(); this.subscription?.remove(); this.listeners.clear(); }
}
