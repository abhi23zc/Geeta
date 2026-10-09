import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGitaPlayback, alignedCues } from '../src/services/gita-playback.ts';
import { canCompleteGita } from '../src/services/ritual-checkpoint.ts';
const narration = { audioSource: 1, completionMs: 1000, segments: [{ kind: 'sanskrit', text: 'line', startMs: 0, endMs: 1000 }] };
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(extra = {}) {
  let now = 0, eligible = true, loaded = true;
  const calls = [], views = [];
  const player = { get isLoaded() { return loaded; }, pause() { calls.push('pause'); }, play() { calls.push('play'); },
    seekTo: async seconds => { calls.push(['seek', seconds]); }, replace: source => { calls.push(['replace', source]); loaded = false; } };
  const controller = createGitaPlayback({ narration, eligible: () => eligible, player, prepare: async () => ({ narration, release: () => calls.push('release') }),
    repaired: async () => calls.push('persist'), changed: view => views.push(view), now: () => now, ...extra });
  const status = (position = 0, patch = {}) => controller.observe({ currentTime: position / 1000, duration: 1, playing: true, isLoaded: loaded, isBuffering: false, didJustFinish: false, ...patch });
  return { controller, calls, views, status, time(value) { now = value; }, visible(value) { eligible = value; }, loaded(value) { loaded = value; } };
}
test('repeated boundary events command pause and seek only once, including synchronous reentry', async () => {
  const h = harness(); await h.controller.play(); h.status(0); h.time(500); h.status(500); h.time(1000);
  h.status(1000); const calls = h.calls.length;
  for (let i = 0; i < 100; i++) h.status(1000);
  assert.equal(h.calls.length, calls); assert.equal(h.controller.getView().throughMs, 1000);
  assert.equal(h.controller.getView().state, 'finished'); assert.equal(h.controller.getView().readingAvailable, false);
});
test('equal displayed status does not notify React repeatedly', async () => {
  const h = harness(); await h.controller.play(); h.status(0); const count = h.views.length;
  for (let i = 0; i < 100; i++) h.status(0);
  assert.equal(h.views.length, count);
});
test('pause/resume preserves contiguous evidence; natural end differs from pause', async () => {
  const h = harness(); await h.controller.play(); h.status(0); h.time(500); h.status(500);
  h.controller.cancel(); h.time(600); h.status(600, { playing: false });
  assert.equal(h.controller.getView().state, 'paused'); assert.equal(h.controller.getView().throughMs, 500);
  await h.controller.play(); h.status(500); h.time(1000); h.status(900); h.time(1100); h.status(1000, { playing: false, didJustFinish: true });
  assert.equal(h.controller.getView().throughMs, 1000); assert.equal(h.controller.getView().state, 'finished');
});
test('short recordings and unverifiable ends explicitly allow reading', async () => {
  const h = harness(); await h.controller.play(); h.status(0, { duration: 0.5 });
  assert.equal(h.controller.getView().readingAvailable, true);
  h.time(500); h.status(500, { duration: 0.5, playing: false, didJustFinish: true });
  assert.equal(h.controller.getView().state, 'finished'); assert.equal(canCompleteGita(500, 1000, false), false);
  assert.equal(canCompleteGita(500, 1000, true), true);
});
test('foreground watchdog excludes deliberate pauses and background time', async () => {
  const h = harness(); await h.controller.play(); h.controller.tick(); h.time(15000); h.controller.tick();
  assert.equal(h.controller.getView().state, 'unavailable');
  const paused = harness(); await paused.controller.play(); paused.controller.cancel(); paused.time(60000); paused.controller.tick();
  assert.equal(paused.controller.getView().readingAvailable, false);
  const background = harness(); await background.controller.play(); background.visible(false); background.time(60000); background.controller.tick(); background.visible(true); background.controller.tick();
  assert.equal(background.controller.getView().readingAvailable, false);
});
test('seek and background samples cannot add credit', async () => {
  const h = harness(); await h.controller.play(); h.status(0); h.time(10); h.status(800);
  assert.equal(h.controller.getView().throughMs, 0);
  h.visible(false); h.time(1000); h.status(1000); assert.equal(h.controller.getView().throughMs, 0);
});
test('stale seek success and failure cannot play or enable fallback after cancellation', async () => {
  for (const reject of [false, true]) {
    let finish; const h = harness();
    const delayed = harness({ player: { isLoaded: true, pause() {}, play() { h.calls.push('stale-play'); }, seekTo: () => new Promise((resolve, fail) => { finish = reject ? fail : resolve; }), replace() {} } });
    const command = delayed.controller.play(); await flush(); delayed.controller.cancel(); finish(); await command;
    assert.deepEqual(h.calls, []); assert.equal(delayed.controller.getView().readingAvailable, false);
  }
});
test('retry is single flight, persists before replace, waits for readiness, retains evidence and reading', async () => {
  const h = harness({ readingAvailable: true, throughMs: 500 });
  const first = h.controller.retry(); await h.controller.retry(); await flush();
  assert.equal(h.controller.getView().state, 'retrying'); assert.equal(h.controller.getView().readingAvailable, true);
  assert.ok(h.calls.indexOf('persist') < h.calls.findIndex(call => Array.isArray(call) && call[0] === 'replace'));
  assert.equal(h.calls.includes('play'), false);
  h.loaded(true); h.status(0); await first;
  assert.equal(h.controller.getView().throughMs, 500); assert.equal(h.calls.filter(call => call === 'play').length, 1);
  h.controller.dispose(); h.controller.dispose(); assert.equal(h.calls.filter(call => call === 'release').length, 1);
});
test('stale preparations release their own pins once on blur, background, unmount or session replacement', async () => {
  for (const cancel of ['blur', 'background', 'unmount', 'session']) {
    let finish, releases = 0;
    const h = harness({ prepare: () => new Promise(resolve => { finish = resolve; }) });
    const pending = h.controller.retry(); h.visible(false);
    cancel === 'unmount' ? h.controller.dispose() : h.controller.cancel();
    finish({ narration, release: () => releases++ }); await pending;
    assert.equal(releases, 1); assert.equal(h.calls.includes('persist'), false); assert.equal(h.calls.includes('play'), false);
  }
});
test('complete text requires exact cue coverage and line alignment; one cue cannot truncate several transliteration lines', () => {
  assert.equal(alignedCues('one\ntwo', [{ text: 'one\ntwo' }], 'first\nsecond'), false);
  assert.equal(alignedCues('one two', [{ text: 'one' }], 'first\nsecond'), false);
  assert.equal(alignedCues('one two', [], 'first\nsecond'), false);
  assert.equal(alignedCues('one\ntwo', [{ text: 'one' }, { text: 'two' }], 'first\nsecond'), true);
});
test('tab changes cannot recreate focus callbacks or status subscriptions; replay never clears completion', () => {
  const screen = readFileSync(new URL('../src/app/gita.tsx', import.meta.url), 'utf8');
  assert.match(screen, /subscription.remove\(\); controller.dispose\(\);[\s\S]*?\}, \[player, restored, sessionId, verse\]\)/);
  const replay = screen.slice(screen.indexOf('const playFromStart'), screen.indexOf('const selectTab'));
  assert.doesNotMatch(replay, /setSessionComplete|setReadingAvailable|setReadingConfirmed|setViewTab/);
  assert.match(screen, /sessionComplete \|\| completingReward.current/);
});
test('restored readiness remains paused until Resume and seeks only to retained evidence', async () => {
  const h = harness({ positionMs: 400, throughMs: 400, initiallyPaused: true });
  h.status(0, { playing: false }); assert.equal(h.controller.getView().state, 'paused'); assert.deepEqual(h.calls, []);
  await h.controller.play(); assert.deepEqual(h.calls[0], ['seek', 0.4]);
});
test('a boundary pause synchronously emitting status cannot reenter boundary commands', async () => {
  let controller, pauses = 0, seeks = 0;
  const status = { currentTime: 1, duration: 1, playing: true, isLoaded: true, isBuffering: false, didJustFinish: false };
  controller = createGitaPlayback({ narration, eligible: () => true, player: { isLoaded: true, play() {}, pause() { pauses++; controller.observe(status); },
    seekTo: async () => { seeks++; }, replace() {} }, changed() {}, prepare: async () => ({ narration, release() {} }), repaired: async () => {} });
  await controller.play(); controller.observe(status); assert.equal(pauses, 1); assert.equal(seeks, 2);
});
test('completion evidence survives replay and repeated decoder failure keeps reading eligible', async () => {
  const h = harness({ throughMs: 1000 }); await h.controller.play(true);
  assert.equal(canCompleteGita(h.controller.getView().throughMs, 1000, false), true);
  h.status(0, { error: 'decoder error' }); assert.equal(h.controller.getView().readingAvailable, true);
  const retry = h.controller.retry(); await flush(); h.loaded(true); h.status(0); await retry;
  h.status(0, { error: 'decoder error' }); assert.equal(h.controller.getView().readingAvailable, true);
  assert.equal(h.controller.getView().throughMs, 1000); h.controller.dispose();
});
test('cancelled readiness waits settle and loading stalls cannot later play', async () => {
  const h = harness(); h.loaded(false); const command = h.controller.play();
  h.controller.tick(); h.time(15000); h.controller.tick(); await command;
  h.loaded(true); h.status(0); assert.equal(h.calls.includes('play'), false); assert.equal(h.controller.getView().state, 'unavailable');
});
test('failure is latched before native pause can synchronously emit the same decoder error', async () => {
  let controller, pauses = 0;
  const status = { currentTime: 0, duration: 1, playing: false, isLoaded: true, isBuffering: false, didJustFinish: false, error: 'decoder' };
  controller = createGitaPlayback({ narration, eligible: () => true, player: { isLoaded: true, play() {}, pause() { pauses++; controller.observe(status); },
    seekTo: async () => {}, replace() {} }, changed() {}, prepare: async () => ({ narration, release() {} }), repaired: async () => {} });
  await controller.play(); controller.observe(status);
  assert.equal(pauses, 1); assert.equal(controller.getView().state, 'unavailable');
});
test('preparation stays disabled through a watchdog failure and disposal prevents stale view updates', async () => {
  let finish;
  const h = harness({ prepare: () => new Promise(resolve => { finish = resolve; }) });
  const pending = h.controller.retry(); h.controller.tick(); h.time(15000); h.controller.tick();
  assert.equal(h.controller.getView().readingAvailable, true); assert.equal(h.controller.getView().preparing, true);
  h.controller.dispose(); const views = h.views.length;
  finish({ narration, release() {} }); await pending;
  assert.equal(h.views.length, views);
});
test('a newer Play settles an older readiness wait and only the newest command can play', async () => {
  const h = harness(); h.loaded(false);
  const first = h.controller.play(); const second = h.controller.play(); await first;
  h.loaded(true); h.status(0); await second;
  assert.equal(h.calls.filter(call => call === 'play').length, 1);
});
