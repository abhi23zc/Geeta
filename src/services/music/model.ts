import type { MusicTrack, RepeatMode, SleepTimerOption } from '../../types/music.ts';
export type QueueEntry = {
    entryId: string;
    track: MusicTrack;
};
export type PlaybackSnapshot = {
    queue: QueueEntry[];
    order: string[];
    history: string[];
    entryId: string | null;
    positionMs: number;
    durationMs: number;
    state: 'idle' | 'loading' | 'paused' | 'playing' | 'completed' | 'failed';
    buffering: boolean;
    speed: number;
    shuffle: boolean;
    repeat: RepeatMode;
    timer: SleepTimerOption;
    remainingMs: number | null;
    interruption: string | null;
    error: string | null;
    excluded: number;
};
export const emptySnapshot = (): PlaybackSnapshot => ({ queue: [], order: [], history: [], entryId: null, positionMs: 0, durationMs: 0, state: 'idle', buffering: false, speed: 1, shuffle: false, repeat: 'off', timer: null, remainingMs: null, interruption: null, error: null, excluded: 0 });
export const speeds = [0.75, 1, 1.25, 1.5, 2];
export function traversal(entries: QueueEntry[], current: string | null, shuffled: boolean, random = Math.random): string[] {
    const ids = entries.map(e => e.entryId);
    if (!shuffled)
        return ids;
    const rest = ids.filter(id => id !== current);
    for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return current && ids.includes(current) ? [current, ...rest] : rest;
}
export function successor(s: PlaybackSnapshot, natural = false): string | null {
    if (natural && s.timer === 'end-of-track')
        return null;
    if (natural && s.repeat === 'one')
        return s.entryId;
    const index = s.order.indexOf(s.entryId ?? '') + 1;
    return s.order[index] ?? (s.repeat === 'all' ? s.order[0] ?? null : null);
}
export interface PlaybackAdapter {
    whenReady(): Promise<void>;
    getSnapshot(): PlaybackSnapshot;
    getLibrarySnapshot(): PlaybackSnapshot;
    subscribe(listener: () => void): () => void;
    replaceQueue(queue: QueueEntry[], entryId: string, play?: boolean): Promise<void>;
    play(): Promise<void>;
    pause(reason?: string): void;
    stop(): void;
    seek(ms: number): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    setSpeed(rate: number): void;
    setShuffle(enabled: boolean): void;
    setRepeat(mode: RepeatMode): void;
    setTimer(timer: SleepTimerOption): void;
    setOwner(owner: 'none' | 'ritual' | 'alarm'): void;
    updateCatalog(tracks: MusicTrack[], enabled: boolean): void;
    dispose(): void;
}

export function librarySnapshot(previous:PlaybackSnapshot,next:PlaybackSnapshot):PlaybackSnapshot {
 return previous.queue===next.queue && previous.entryId===next.entryId && previous.state===next.state && previous.error===next.error && previous.shuffle===next.shuffle && previous.repeat===next.repeat && previous.speed===next.speed && previous.excluded===next.excluded && previous.durationMs===next.durationMs ? previous : next;
}
