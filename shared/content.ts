/** Wire contract shared by the publisher and the offline client. */
export type ToneKey = 'gita' | 'shankh' | 'pranayama';
export type Segment = { kind: 'intro' | 'sanskrit' | 'meaning'; text: string; startMs: number; endMs: number };
export type AudioAsset = { id: string; url: string; mimeType: 'audio/mpeg' | 'audio/mp4'; bytes: number; sha256: string; durationMs: number };
export type PublishedPractice = {
  id: string; revision: string; kind: 'gita' | 'mantra' | 'stotram' | 'reflection';
  chapter: number; verse: string; referenceLabel?: string; theme: string;
  readerLabels?: { primary: string; interpretation: string; glossary: string };
  sanskrit: string; transliteration: string; meaning: string; takeaway: string;
  context: string; reflectionPrompt: string; words: { sanskrit: string; meaning: string }[];
  narration: { asset: AudioAsset; completionMs: number; segments: Segment[] };
};
export type AlarmTone = { key: ToneKey; revision: string; title: string; description: string; asset: AudioAsset };
export type AlarmCycle = { key: ToneKey; revision: string; startDate: string; tracks: { title: string; asset: AudioAsset }[] };
export type ImageAsset = { id: string; url: string; mimeType: 'image/webp'; bytes: number; sha256: string; width: number; height: number };
export type AlarmImageCycle = { revision: string; startDate: string; images: (ImageAsset | null)[] };
export type ContentAsset = AudioAsset | ImageAsset;
export function parseImageAsset(value: unknown): ImageAsset {
  const v = record(value);
  const url = new URL(string(v.url, 'image URL', 2048));
  if (url.protocol !== 'https:' || url.username || url.password || !['firebasestorage.googleapis.com', 'storage.googleapis.com'].includes(url.hostname)) throw new Error('Unsupported image host');
  if (v.mimeType !== 'image/webp' || typeof v.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(v.sha256)) throw new Error('Invalid image metadata');
  const bytes = number(v.bytes, 'image size', 10 * MB, 1);
  const width = number(v.width, 'image width', 2048, 1), height = number(v.height, 'image height', 2048, 1);
  if (![bytes, width, height].every(Number.isInteger)) throw new Error('Invalid image dimensions or size');
  return { id: identifier(v.id), url: url.href, mimeType: 'image/webp', bytes, sha256: v.sha256, width, height };
}
export function parseAlarmImageCycle(value: unknown): AlarmImageCycle {
  const v = record(value);
  if (!validDate(v.startDate) || !Array.isArray(v.images) || v.images.length !== 7) throw new Error('Choose a start date and seven image slots');
  return { revision: identifier(v.revision), startDate: v.startDate, images: Array.from(v.images, image => image === null ? null : parseImageAsset(image)) };
}
export function alarmImageIndex(cycle: Pick<AlarmImageCycle, 'startDate'>, date: string): number | null {
  if (!validDate(date) || !validDate(cycle.startDate)) return null;
  const days = Math.round((Date.parse(date) - Date.parse(cycle.startDate)) / 86400000);
  return days < 0 ? null : days % 7;
}
export function contentAssetFilename(asset: ContentAsset) { return `${asset.id}-${asset.sha256}.${asset.mimeType === 'image/webp' ? 'webp' : 'audio'}`; }
export type ContentWindow = { schemaVersion: 1; releaseId: string; publishedAt: string; enabled: boolean; locale: 'hi-IN'; days: { date: string; practice: PublishedPractice | null }[]; alarms: AlarmTone[]; alarmCycles?: AlarmCycle[]; alarmImageCycle?: AlarmImageCycle };
export const MB = 1024 * 1024;
export const TONE_KEYS: ToneKey[] = ['gita', 'shankh', 'pranayama'];
export function toneKey(value: string): ToneKey {
  if (value === 'shankh' || value === 'Gentle Shankh & Chants') return 'shankh';
  if (value === 'pranayama' || value === 'Pranayama First') return 'pranayama';
  return 'gita';
}
export function toneLabel(value: string): string {
  return { gita: 'Raag Bhairav & Sacred Flute', shankh: 'Gentle Shankh & Chants', pranayama: 'Pranayama First' }[toneKey(value)];
}
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function dateWindow(start: string, count = 7): string[] {
  if (!validDate(start) || count < 1 || count > 14) throw new Error('Invalid date window');
  return Array.from({ length: count }, (_, i) => new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10));
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string, max = 20000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${name}`);
  return value;
}
function number(value: unknown, name: string, max: number, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}
export function identifier(value: unknown): string {
  const result = string(value, 'identifier', 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(result)) throw new Error('Unsafe identifier');
  return result;
}
export function parseAsset(value: unknown, limit = 20 * MB): AudioAsset {
  const v = record(value);
  const url = new URL(string(v.url, 'audio URL', 2048));
  if (url.protocol !== 'https:' || url.username || url.password || !['firebasestorage.googleapis.com', 'storage.googleapis.com'].includes(url.hostname)) throw new Error('Unsupported audio host');
  if (v.mimeType !== 'audio/mpeg' && v.mimeType !== 'audio/mp4') throw new Error('Unsupported audio type');
  const sha256 = string(v.sha256, 'hash', 64);
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid SHA-256');
  const bytes = number(v.bytes, 'size', limit, 1);
  if (!Number.isInteger(bytes)) throw new Error('Invalid byte size');
  return { id: identifier(v.id), url: url.href, mimeType: v.mimeType, bytes, sha256, durationMs: number(v.durationMs, 'duration', 3600000, 1) };
}
export function parsePractice(value: unknown): PublishedPractice {
  const v = record(value), n = record(v.narration);
  const asset = parseAsset(n.asset);
  const completionMs = number(n.completionMs, 'completion', asset.durationMs, 1);
  if (!Array.isArray(n.segments) || !n.segments.length || n.segments.length > 500) throw new Error('Missing narration timings');
  let previous = 0;
  const segments = n.segments.map(item => {
    const s = record(item);
    if (!['intro', 'sanskrit', 'meaning'].includes(String(s.kind))) throw new Error('Invalid segment kind');
    const startMs = number(s.startMs, 'segment start', completionMs), endMs = number(s.endMs, 'segment end', completionMs, 1);
    if (startMs < previous || endMs <= startMs) throw new Error('Overlapping or unordered segments');
    previous = endMs;
    return { kind: s.kind as Segment['kind'], text: string(s.text, 'segment text'), startMs, endMs };
  });
  if (!segments.some(s => s.kind === 'sanskrit') || !segments.some(s => s.kind === 'meaning')) throw new Error('Sanskrit and meaning timings required');
  if (!Array.isArray(v.words) || v.words.length > 500) throw new Error('Invalid glossary');
  if (!['gita', 'mantra', 'stotram', 'reflection'].includes(String(v.kind))) throw new Error('Invalid practice kind');
  const result: PublishedPractice = {
    id: identifier(v.id), revision: identifier(v.revision), kind: v.kind as PublishedPractice['kind'],
    chapter: number(v.chapter, 'chapter', 100), verse: string(v.verse, 'verse', 100),
    theme: string(v.theme, 'theme'), sanskrit: string(v.sanskrit, 'Sanskrit'),
    transliteration: string(v.transliteration, 'transliteration'), meaning: string(v.meaning, 'meaning'),
    takeaway: string(v.takeaway, 'takeaway'), context: string(v.context, 'context'), reflectionPrompt: string(v.reflectionPrompt, 'reflection prompt'),
    words: v.words.map(item => { const w = record(item); return { sanskrit: string(w.sanskrit, 'word'), meaning: string(w.meaning, 'word meaning') }; }),
    narration: { asset, completionMs, segments },
  };
  if (v.referenceLabel !== undefined) result.referenceLabel = string(v.referenceLabel, 'reference');
  if (v.readerLabels !== undefined) { const l = record(v.readerLabels); result.readerLabels = { primary: string(l.primary, 'label'), interpretation: string(l.interpretation, 'label'), glossary: string(l.glossary, 'label') }; }
  return result;
}
export function parseAlarm(value: unknown): AlarmTone {
  const v = record(value);
  if (!TONE_KEYS.includes(v.key as ToneKey)) throw new Error('Invalid alarm mode');
  return { key: v.key as ToneKey, revision: identifier(v.revision), title: string(v.title, 'tone title'), description: string(v.description, 'tone description'), asset: parseAsset(v.asset, 10 * MB) };
}
export function parseAlarmCycle(value: unknown): AlarmCycle {
  const v = record(value);
  if (!TONE_KEYS.includes(v.key as ToneKey) || !validDate(v.startDate)) throw new Error('Invalid alarm cycle mode or start date');
  if (!Array.isArray(v.tracks) || v.tracks.length < 1 || v.tracks.length > 14) throw new Error('An alarm cycle requires 1–14 tracks');
  return { key: v.key as ToneKey, revision: identifier(v.revision), startDate: v.startDate, tracks: Array.from(v.tracks, item => {
    const t = record(item);
    return { title: string(t.title, 'track title', 200), asset: parseAsset(t.asset, 10 * MB) };
  }) };
}
export function parseAlarmCycles(value: unknown): AlarmCycle[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 3) throw new Error('Invalid alarm cycles');
  const cycles = value.map(parseAlarmCycle);
  if (new Set(cycles.map(c => c.key)).size !== cycles.length) throw new Error('Duplicate alarm cycle mode');
  return cycles;
}
/** Dates are local calendar labels; UTC arithmetic avoids DST changing the day index. */
export function alarmCycleIndex(cycle: Pick<AlarmCycle, 'startDate' | 'tracks'>, date: string): number | null {
  if (!validDate(date) || !validDate(cycle.startDate) || !cycle.tracks.length) return null;
  const elapsed = Math.round((Date.parse(date) - Date.parse(cycle.startDate)) / 86400000);
  return elapsed < 0 ? null : elapsed % cycle.tracks.length;
}
export function parseWindow(value: unknown, start: string): ContentWindow {
  const v = record(value), expected = dateWindow(start);
  if (v.schemaVersion !== 1 || v.locale !== 'hi-IN' || typeof v.enabled !== 'boolean') throw new Error('Unsupported content schema');
  if (!Array.isArray(v.days) || v.days.length !== 7 || !Array.isArray(v.alarms) || v.alarms.length > 3) throw new Error('Invalid content window');
  const days = v.days.map((item, i) => { const d = record(item); if (d.date !== expected[i]) throw new Error('Unexpected date assignment'); return { date: expected[i], practice: d.practice === null ? null : parsePractice(d.practice) }; });
  const alarms = v.alarms.map(parseAlarm);
  if (new Set(alarms.map(a => a.key)).size !== alarms.length) throw new Error('Duplicate alarm mode');
  const alarmCycles = parseAlarmCycles(v.alarmCycles);
  const alarmImageCycle = v.alarmImageCycle === undefined ? undefined : parseAlarmImageCycle(v.alarmImageCycle);
  const assets = [...(alarmImageCycle?.images.filter((a): a is ImageAsset => a !== null) ?? []), ...alarmCycles.flatMap(c => c.tracks.map(t => t.asset)), ...days.flatMap(d => d.practice ? [d.practice.narration.asset] : []), ...alarms.map(a => a.asset)];
  const identities = new Map<string, string>();
  for (const a of assets) { const identity = `${a.sha256}:${a.bytes}:${a.mimeType}`; if (identities.has(a.id) && identities.get(a.id) !== identity) throw new Error('Conflicting asset identity'); identities.set(a.id, identity); }
  const publishedAt = string(v.publishedAt, 'publication time', 64);
  if (!Number.isFinite(Date.parse(publishedAt))) throw new Error('Invalid publication time');
  return { schemaVersion: 1, releaseId: identifier(v.releaseId), publishedAt, enabled: v.enabled, locale: 'hi-IN', days, alarms, ...(v.alarmCycles !== undefined ? { alarmCycles } : {}), ...(alarmImageCycle ? { alarmImageCycle } : {}) };
}
