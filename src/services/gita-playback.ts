import type { GitaNarration } from '../data/gita-verses';
import { advanceListening, type ListeningSample } from './ritual-checkpoint.ts';

export type PlaybackState = 'loading' | 'ready' | 'playing' | 'paused' | 'retrying' | 'finished' | 'unavailable';
export type PlaybackStatus = { currentTime: number; duration: number; playing: boolean; isLoaded: boolean; isBuffering: boolean; didJustFinish: boolean; error?: string | null };
export type PlaybackView = { state: PlaybackState; positionMs: number; throughMs: number; readingAvailable: boolean; preparing: boolean; reason: string };
type Recording = { narration: GitaNarration; release: () => void };
type Options = {
  narration?: GitaNarration;
  positionMs?: number;
  throughMs?: number;
  readingAvailable?: boolean;
  initiallyPaused?: boolean;
  eligible: () => boolean;
  player: { pause: () => void; play: () => void; seekTo: (seconds: number) => Promise<void>; replace: (source: GitaNarration['audioSource']) => void; readonly isLoaded: boolean };
  prepare: () => Promise<Recording>;
  repaired: (narration: GitaNarration) => Promise<void>;
  installed?: (narration: GitaNarration) => void;
  changed: (view: PlaybackView) => void;
  now?: () => number;
  diagnostic?: (event: string, generation: number, state: PlaybackState) => void;
};

/** A screen session owns one controller and one status subscription. Commands never depend on rendered status. */
export function createGitaPlayback(options: Options) {
  let narration = options.narration;
  let view: PlaybackView = { state: narration ? 'loading' : 'unavailable', positionMs: options.positionMs ?? 0,
    throughMs: options.throughMs ?? narration?.segments[0]?.startMs ?? 0, readingAvailable: !narration || !!options.readingAvailable, preparing: false, reason: '' };
  let generation = 0, intent = false, boundaryHandled = false, seeking = false, preparing = false, disposed = false;
  let sample: ListeningSample | null = null, release: (() => void) | undefined;
  let readyWait: { resolve: () => void; reject: () => void } | undefined;
  const now = options.now ?? Date.now;
  let movement = now(), visible = false, observed = '', wasLoaded = false;
  const diagnostic = (event: string) => options.diagnostic?.(event, generation, view.state);
  const publish = (patch: Partial<PlaybackView>) => {
    if (disposed) return;
    const next = { ...view, ...patch };
    if (Object.keys(next).some(key => next[key as keyof PlaybackView] !== view[key as keyof PlaybackView])) {
      if (next.state !== view.state) diagnostic(`transition:${next.state}`);
      view = next; options.changed({ ...view });
    }
  };
  const safePause = () => { try { options.player.pause(); } catch { /* Native teardown. */ } };
  const valid = (command: number) => command === generation && !disposed && options.eligible();
  const fail = (reason = 'Narration could not play. Retry or continue by reading.') => {
    generation++; intent = false; sample = null; seeking = false;
    readyWait?.reject(); readyWait = undefined;
    publish({ state: 'unavailable', readingAvailable: true, reason }); safePause();
  };
  const cancel = () => {
    if (disposed) return;
    generation++; intent = false; sample = null; seeking = false;
    readyWait?.reject(); readyWait = undefined;
    diagnostic('cancel'); safePause();
    if (view.state !== 'finished' && view.state !== 'unavailable') publish({ state: 'paused' });
  };
  const waitReady = () => options.player.isLoaded ? Promise.resolve() : new Promise<void>((resolve, reject) => {
    readyWait = { resolve, reject: () => reject(new Error('Cancelled')) };
  });
  const play = async (restart = false) => {
    if (disposed || !narration || preparing || !options.eligible()) return;
    const command = ++generation;
    readyWait?.reject(); readyWait = undefined;
    diagnostic(restart ? 'replay' : 'play');
    intent = true; movement = now(); sample = null; seeking = true; boundaryHandled = false;
    publish({ state: 'loading' });
    try {
      await waitReady();
      if (!valid(command)) return;
      const position = restart ? narration.segments[0]?.startMs ?? 0 : view.positionMs;
      await options.player.seekTo(position / 1000);
      if (!valid(command)) return;
      seeking = false; sample = null; publish({ positionMs: position, state: 'playing' });
      options.player.play();
    } catch { if (valid(command)) fail(); }
  };
  const retry = async () => {
    if (disposed || preparing || !options.eligible()) return;
    cancel(); preparing = true;
    const command = ++generation;
    movement = now(); intent = true;
    publish({ state: 'retrying', preparing: true }); diagnostic('retry');
    let prepared: Recording | undefined;
    try {
      prepared = await options.prepare();
      if (!valid(command)) return;
      // Persist the repaired local URI before native playback can use it.
      await options.repaired(prepared.narration);
      if (!valid(command)) return;
      release?.(); release = prepared.release; narration = prepared.narration; prepared = undefined;
      options.installed?.(narration);
      seeking = true; boundaryHandled = false; sample = null;
      options.player.replace(narration.audioSource);
      await waitReady();
      if (!valid(command)) return;
      const position = narration.segments[0]?.startMs ?? 0;
      await options.player.seekTo(position / 1000);
      if (!valid(command)) return;
      seeking = false; sample = null; publish({ positionMs: position, state: 'playing', reason: '' });
      options.player.play();
    } catch (error) {
      if (valid(command)) {
        const message = error instanceof Error ? error.message : '';
        const explained = ['Content refresh is running. Try again shortly.', 'Waiting for Wi-Fi',
          'Recording downloads require Android. You can complete by reading.', 'Matching recording metadata is unavailable. You can complete by reading.',
          'Connect to repair this recording, or complete by reading.', 'Not enough free storage for upcoming content',
          'Sync ownership expired', 'Audio checksum verification failed', 'Download paused'];
        fail(explained.includes(message) ? message : undefined);
      }
    } finally { prepared?.release(); preparing = false; publish({ preparing: false }); }
  };
  const observe = (status: PlaybackStatus) => {
    const signature = `${status.isLoaded}:${status.playing}:${status.isBuffering}:${status.didJustFinish}:${!!status.error}`;
    if (signature !== observed) { observed = signature; diagnostic('observe'); }
    if (disposed || !narration) return;
    if (status.isLoaded && !wasLoaded && options.eligible()) movement = now();
    wasLoaded = status.isLoaded;
    if (status.isLoaded) {
      readyWait?.resolve(); readyWait = undefined;
      if (view.state === 'loading' && !intent) publish({ state: options.initiallyPaused ? 'paused' : 'ready' });
    }
    if (!options.eligible()) { sample = null; return; }
    if (status.error && view.state !== 'unavailable') { fail(); return; }
    const end = narration.completionMs;
    if (status.isLoaded && status.duration > 0 && status.duration * 1000 < end - 150) {
      publish({ readingAvailable: true, reason: 'This recording ends before the reviewed boundary. You can complete by reading.' });
    }
    if (seeking || preparing || boundaryHandled || !intent) return;
    const position = Math.min(end, Math.max(0, Math.round(status.currentTime * 1000)));
    const next = { positionMs: position, now: now(), playing: status.playing && !status.isBuffering, visible: true };
    if (position !== view.positionMs) movement = next.now;
    const through = advanceListening(view.throughMs, sample, next, end);
    sample = next;
    publish({ positionMs: position, throughMs: through, state: status.playing ? 'playing' : view.state });
    if (position >= end || status.didJustFinish) {
      // Latch before pause/seek can synchronously publish another status event.
      boundaryHandled = true; intent = false; sample = null;
      publish({ state: 'finished', ...(through < end ? { readingAvailable: true,
        reason: 'Listening could not be verified to the reviewed boundary. You can complete by reading.' } : {}) });
      diagnostic('boundary'); safePause();
      if (position >= end) {
        const command = generation;
        try { void options.player.seekTo(end / 1000).catch(() => { if (valid(command)) fail(); }); } catch { if (valid(command)) fail(); }
      }
    } else if (!status.playing && !status.isBuffering && status.isLoaded && view.state === 'playing') {
      // An interruption is a pause, not a natural end or audio failure.
      intent = false; sample = null; publish({ state: 'paused' });
    }
  };
  const tick = () => {
    if (disposed) return;
    const active = options.eligible();
    if (!active) { visible = false; movement = now(); return; }
    if (!visible) { visible = true; movement = now(); }
    if ((intent || view.state === 'loading') && now() - movement >= 15000) {
      fail('Narration stopped making progress. Retry or continue by reading.');
    }
  };
  return { play, retry, observe, tick, cancel, getView: () => ({ ...view }),
    dispose: () => { cancel(); disposed = true; release?.(); release = undefined; } };
}

/** Cue text must cover the entire frozen block; transliteration also needs one cue per line. */
export function alignedCues(text: string, cues: readonly { text: string }[], transliteration?: string) {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  return cues.length > 0 && normalize(cues.map(cue => cue.text).join(' ')) === normalize(text)
    && (transliteration === undefined || (transliteration.split('\n').filter(line => line.trim()).length === cues.length
      && text.split('\n').filter(line => line.trim()).length === cues.length
      && text.split('\n').filter(line => line.trim()).every((line, index) => normalize(line) === normalize(cues[index].text))));
}
