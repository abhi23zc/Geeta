import { MB, parseAsset, parsePractice, type AudioAsset, type PublishedPractice } from '../../shared/content';

/** Import author JSON separately from the server-verified recording metadata. */
export function importPractice(text: string, uploaded?: AudioAsset): PublishedPractice {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('The content is not valid JSON. Check commas and quotation marks.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.narration || typeof value.narration !== 'object') {
    throw new Error('Paste one complete teaching with its narration timings.');
  }
  let asset: AudioAsset;
  try { asset = parseAsset(uploaded ?? value.narration.asset); }
  catch { throw new Error('Choose the narration MP3 or M4A. Audio details are filled in automatically after upload.'); }
  const completionMs = value.narration.completionMs ?? asset.durationMs;
  if (typeof completionMs === 'number' && completionMs > asset.durationMs) {
    throw new Error(`The teaching ends at ${(completionMs / 1000).toFixed(2)} seconds, but the recording is only ${(asset.durationMs / 1000).toFixed(2)} seconds. Check that you selected the matching audio.`);
  }
  // Older installed clients understand intro cues; closing cues use the same
  // non-highlighted presentation. Keep their text and boundaries intact.
  const segments = Array.isArray(value.narration.segments) ? value.narration.segments.map((s: unknown) => {
    if (s && typeof s === 'object' && 'kind' in s && s.kind === 'outro') return { ...s, kind: 'intro' };
    return s;
  }) : value.narration.segments;
  return parsePractice({ ...value, narration: { ...value.narration, asset, completionMs, segments } });
}

export function checkAudioFile(file: { name: string; size: number }, kind: 'daily' | 'alarm') {
  if (!/\.(mp3|m4a)$/i.test(file.name)) throw new Error('Choose an MP3 or M4A recording.');
  const max = (kind === 'alarm' ? 10 : 20) * MB;
  if (file.size < 1 || file.size > max) throw new Error(`Recording must be between 1 byte and ${max / MB} MB.`);
}
