import type { GitaVerse } from '../data/gita-verses';

type Base = { version: 1; sessionId: string; stage: 'breathe' | 'gita' };
export type BreathingCheckpoint = Base & { stage: 'breathe'; elapsed: number; preparation: number; lifecycle: 'preparing' | 'active' | 'paused' | 'complete' };
export type GitaCheckpoint = Base & { stage: 'gita'; verse: GitaVerse; positionMs: number; playedThroughMs: number; completionMs: number; readingAvailable: boolean; readingConfirmed: boolean; complete: boolean; paused: boolean };
/** Unfinished breathing always re-enters through the full Get Ready countdown. */
export function breathingEntryState(checkpoint: BreathingCheckpoint | null) {
  return checkpoint?.elapsed === 70
    ? { lifecycle: 'complete' as const, elapsed: 70, preparation: 0 }
    : { lifecycle: 'preparing' as const, elapsed: 0, preparation: 3 };
}
export type RitualCheckpoint = BreathingCheckpoint | GitaCheckpoint;
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function parseRitualCheckpoint(raw: string | null, sessionId: string | null | undefined, stage: RitualCheckpoint['stage']): RitualCheckpoint | null {
  if (!raw || !sessionId || raw.length > 65536) return null;
  try {
    const c = JSON.parse(raw);
    if (c.version !== 1 || c.sessionId !== sessionId || c.stage !== stage) return null;
    if (stage === 'breathe') return Number.isInteger(c.elapsed) && c.elapsed >= 0 && c.elapsed <= 70 && Number.isInteger(c.preparation) && c.preparation >= 0 && c.preparation <= 3 && ['preparing', 'active', 'paused', 'complete'].includes(c.lifecycle) ? c : null;
    const v = c.verse;
    if (!v || typeof v.id !== 'string' || !v.id || !['sanskrit', 'transliteration', 'meaning', 'takeaway', 'context', 'reflectionPrompt'].every(k => typeof v[k] === 'string') || !Array.isArray(v.words) || !v.words.every((w: { sanskrit?: unknown; meaning?: unknown }) => typeof w?.sanskrit === 'string' && typeof w.meaning === 'string')) return null;
    if (!finite(c.positionMs) || !finite(c.playedThroughMs) || !finite(c.completionMs) || !['readingAvailable', 'readingConfirmed', 'complete', 'paused'].every(k => typeof c[k] === 'boolean')) return null;
    if (v.narration && (!validNarration(v.narration) || c.completionMs !== v.narration.completionMs || c.positionMs > c.completionMs || c.playedThroughMs > c.completionMs)) return null;
    if (c.complete && !canCompleteGita(c.playedThroughMs, c.completionMs, c.readingAvailable && c.readingConfirmed)) return null;
    return c;
  } catch { return null; }
}
export function validNarration(n: GitaVerse['narration']): boolean {
  if (!n || !finite(n.completionMs) || n.completionMs <= 0 || !Array.isArray(n.segments) || !n.segments.length) return false;
  const source = n.audioSource;
  if (!(typeof source === 'number' || (source && typeof source.uri === 'string' && source.uri.startsWith('file://')))) return false;
  let end = 0;
  return n.segments.every(s => {
    const valid = ['intro', 'sanskrit', 'meaning'].includes(s.kind) && typeof s.text === 'string' && finite(s.startMs) && finite(s.endMs) && s.startMs >= end && s.endMs > s.startMs && s.endMs <= n.completionMs;
    end = s.endMs; return valid;
  });
}
export function canCompleteGita(playedThroughMs: number, completionMs: number, readingConfirmed: boolean): boolean {
  return readingConfirmed || (finite(completionMs) && completionMs > 0 && playedThroughMs >= completionMs);
}
export type ListeningSample = { positionMs: number; now: number; playing: boolean; visible: boolean };
/** Only contiguous foreground playback counts. Seeks, background gaps, and clock jumps do not. */
export function advanceListening(through: number, previous: ListeningSample | null, next: ListeningSample, end: number): number {
  if (!previous || !previous.playing || !previous.visible || !next.visible) return through;
  const wall = next.now - previous.now, delta = next.positionMs - previous.positionMs;
  if (wall < 0 || wall > 2000 || delta < 0 || delta > wall + 250 || previous.positionMs > through + 150) return through;
  return Math.min(end, Math.max(through, next.positionMs));
}
