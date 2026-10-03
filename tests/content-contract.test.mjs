import test from 'node:test';
import assert from 'node:assert/strict';
import { dateWindow, parsePractice, parseWindow, parseAsset, toneKey, MB } from '../shared/content.ts';
const asset = { id: 'a1', url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/asset', mimeType: 'audio/mpeg', bytes: 1000, sha256: 'a'.repeat(64), durationMs: 5000 };
const practice = { id: '10-20', revision: 'r1', kind: 'gita', chapter: 10, verse: '20', theme: 'Theme', sanskrit: 'संस्कृत', transliteration: 'Sanskrit', meaning: 'Meaning', takeaway: 'Takeaway', reflectionPrompt: 'Prompt', context: 'Context', words: [{ sanskrit: 'आत्मा', meaning: 'Self' }], narration: { asset, completionMs: 5000, segments: [{ kind: 'sanskrit', text: 'संस्कृत', startMs: 0, endMs: 2000 }, { kind: 'meaning', text: 'Meaning', startMs: 2500, endMs: 5000 }] } };
const window = () => ({ schemaVersion: 1, releaseId: 'r1', publishedAt: '2026-10-03T00:00:00Z', enabled: true, locale: 'hi-IN', days: dateWindow('2026-10-03').map(date => ({ date, practice })), alarms: [] });
test('seven dates cross leap, month, and year boundaries', () => {
  assert.deepEqual(dateWindow('2024-02-27').slice(0,4), ['2024-02-27','2024-02-28','2024-02-29','2024-03-01']);
  assert.equal(dateWindow('2026-12-29')[6], '2027-01-04');
  assert.throws(() => dateWindow('2026-02-30'));
});
test('complete practice and explicit missing schedule slots are accepted', () => {
  assert.equal(parsePractice(practice).id, '10-20');
  const v=window(); v.days[2].practice=null; assert.equal(parseWindow(v,'2026-10-03').days[2].practice,null);
});
test('reject malicious file identifiers, hosts, oversized assets and invalid hashes', () => {
  for (const override of [{id:'../escape'}, {url:'http://firebasestorage.googleapis.com/file'}, {url:'https://evil.test/file'}, {bytes:21*MB}, {sha256:'invalid'}]) assert.throws(() => parseAsset({...asset,...override}));
});
test('reject audio/text timing mismatch, overlap and incomplete timed content', () => {
  assert.throws(() => parsePractice({...practice,narration:{...practice.narration,completionMs:6000}}));
  assert.throws(() => parsePractice({...practice,narration:{...practice.narration,segments:[practice.narration.segments[1],practice.narration.segments[0]]}}));
  assert.throws(() => parsePractice({...practice,narration:{...practice.narration,segments:[practice.narration.segments[0]]}}));
});
test('reject unsupported schemas, date reassignment and conflicting immutable asset IDs', () => {
  assert.throws(() => parseWindow({...window(),schemaVersion:2},'2026-10-03'));
  assert.throws(() => parseWindow(window(),'2026-10-04'));
  const v=window(); v.days[1].practice={...practice,narration:{...practice.narration,asset:{...asset,sha256:'b'.repeat(64)}}}; assert.throws(() => parseWindow(v,'2026-10-03'));
});
test('legacy alarm mode names resolve without altering the schedule', () => {
  assert.equal(toneKey('Raag Bhairav & Sacred Flute'),'gita'); assert.equal(toneKey('Gentle Shankh & Chants'),'shankh'); assert.equal(toneKey('Pranayama First'),'pranayama');
});
