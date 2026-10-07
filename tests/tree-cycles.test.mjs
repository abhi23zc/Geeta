import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import * as model from '../src/features/progress/model.ts';
import * as v2 from '../src/features/progress/v2-model.ts';
import { createTreeSession, recoverySteps, playbackPriority } from '../src/features/progress/tree/session-model.ts';
const day = n => model.shiftDay('2026-01-01', n);
const now = n => new Date(`${day(n)}T18:00:00Z`);
const initial = () => model.emptyDailyProgress(new Date('2026-01-01T00:00:00Z'), 'UTC');
const receipts = n => [{ id: `q${n}`, kind: 'quiz', completedAt: `${day(n)}T12:00:00Z` }, { id: `r${n}`, kind: 'ritual', startedAt: `${day(n)}T06:00:00Z`, breathingAt: `${day(n)}T06:05:00Z`, completedAt: `${day(n)}T06:10:00Z` }];
const earn = (p, n) => model.applyReceipts(p, receipts(n), now(n));
const check = p => assert.deepEqual(model.parseDailyProgress(JSON.stringify(p), new Date(`${p.lastObserved}T18:00:00Z`), 'UTC'), p);
test('level twelve loses one per ended partial or inactive day and regrows independently of streak', () => {
  let p = initial(); for (let n=0;n<12;n++) p=earn(p,n);
  p=model.applyReceipts(p,[receipts(12)[0]],now(12));
  assert.equal(p.tree.level,12); assert.equal(p.current,12); const balance=p.balance;
  p=model.settle(p,day(13)); assert.equal(p.tree.level,11); assert.equal(p.current,0); assert.equal(p.balance,balance);
  p=earn(p,13); assert.equal(p.tree.level,12); assert.equal(p.current,1); check(p);
  p=model.settle(p,day(18)); assert.equal(p.tree.level,8); assert.equal(p.tree.transition.lost,4); check(p);
  assert.deepEqual(model.settle(p,day(18)),p);
  p=model.settle(p,day(10000)); assert.equal(p.tree.level,0); assert.equal(p.tree.cycle,1); check(p);
});
test('regrowth cannot duplicate bonuses, but a second completed tree earns fresh bonuses', () => {
  let p=initial();for(let n=0;n<7;n++)p=earn(p,n);
  p=model.settle(p,day(8));assert.equal(p.tree.level,6);
  p=earn(p,8);assert.equal(p.tree.level,7);assert.equal(p.current,1);assert.equal(p.ledger.filter(e=>e.kind==='milestone').length,1);
  for(let n=9;n<32;n++)p=earn(p,n);
  assert.equal(p.tree.level,30);assert.equal(p.tree.completed,day(31));assert.equal(p.tree.completedCount,1);check(p);
  const mature=p;
  p=model.settle(p,day(32));assert.equal(p.tree.level,0);assert.equal(p.tree.cycle,2);assert.equal(p.current,0);assert.equal(p.tree.transition.kind,'rollover');check(p);
  assert.deepEqual(model.settle(p,day(32)),p);
  for(let n=32;n<62;n++)p=earn(p,n);
  assert.equal(p.tree.completedCount,2);assert.deepEqual(p.tree.bonuses,[7,30]);assert.equal(p.ledger.filter(e=>e.kind==='milestone').length,4);check(p);
  const absent=model.settle(mature,day(9000));assert.equal(absent.tree.cycle,2);assert.equal(absent.tree.level,0);assert.equal(absent.tree.completedCount,1);check(absent);
});
test('offline receipts are processed before losses and crossing maturity starts the new cycle chronologically', () => {
  let p=initial();for(let n=0;n<28;n++)p=earn(p,n);
  p=model.applyReceipts(p,[...receipts(30),...receipts(29),...receipts(28)].reverse(),now(33));
  assert.equal(p.total,31);assert.equal(p.tree.cycle,2);assert.equal(p.tree.level,0);assert.equal(p.current,0);check(p);
  assert.deepEqual(model.applyReceipts(p,receipts(30),now(33)),p);
});
test('v2 migration recovers receipts, preserves historical best and imports maturity until next midnight', () => {
  let old=v2.emptyDailyProgress(new Date('2026-01-01T00:00:00Z'),'UTC');
  for(let n=0;n<35;n++)old=v2.applyReceipts(old,receipts(n),now(n));
  const p=model.migrateDailyProgress(old,[],now(34),'UTC');
  assert.equal(p.best,35);assert.equal(p.current,30);assert.equal(p.tree.level,30);assert.equal(p.tree.revision,0);assert.equal(p.balance,old.balance);assert.deepEqual(p.ledger,old.ledger);check(p);
  const next=earn(p,35);assert.equal(next.tree.cycle,2);assert.equal(next.tree.level,1);assert.equal(next.current,1);check(next);
  const settled=model.migrateDailyProgress(old,[],now(40),'UTC');assert.equal(settled.tree.level,0);assert.equal(settled.tree.revision,0);check(settled);
});
test('migration starts tree loss prospectively and never replays historical growth penalties', () => {
  let old=v2.emptyDailyProgress(new Date('2026-01-01T00:00:00Z'),'UTC');for(let n=0;n<12;n++)old=v2.applyReceipts(old,receipts(n),now(n));
  const p=model.migrateDailyProgress(old,[],now(12),'UTC');assert.equal(p.tree.level,12);
  const next=model.settle(p,day(13));assert.equal(next.tree.level,11);check(next);
});
test('saved timezone midnight and rollback cannot settle twice', () => {
  let p=earn(initial(),0);p=model.prepareTimezone(p,'Asia/Kolkata',now(0));assert.equal(p.timezone,'UTC');
  p=model.applyReceipts(p,[],new Date('2026-01-02T23:59:59Z'));assert.equal(p.tree.level,1);
  p=model.applyReceipts(p,[],new Date('2026-01-03T00:00:00Z'));assert.equal(p.tree.level,0);
  assert.deepEqual(model.applyReceipts(p,receipts(1),now(1)),p);check(p);
});
test('Home and Progress get independent focused visits, only background resets session', () => {
  const s=createTreeSession();assert.equal(s.claim('home'),true);assert.equal(s.claim('home'),false);assert.equal(s.claim('progress'),true);
  s.change('inactive');assert.equal(s.change('active'),false);assert.equal(s.claim('home'),false);
  s.change('background');s.change('inactive');assert.equal(s.change('active'),true);assert.equal(s.claim('home'),true);assert.equal(s.claim('progress'),true);
  assert.deepEqual(Object.values(playbackPriority),[1,2,3,4]);
  assert.deepEqual(recoverySteps(12,9).map(x=>x.duration),[700,700,700]);assert.deepEqual(recoverySteps(12,3),[{from:12,to:3,duration:900}]);assert.deepEqual(recoverySteps(30,0,true),[{from:30,to:0,duration:900}]);
});
test('every stage has bundled offline media and mature visits select the short segment', () => {
  const registry=readFileSync('src/features/progress/tree/assets.ts','utf8');
  for(let n=1;n<=30;n++){const id=String(n).padStart(2,'0');assert.ok(registry.includes(`day-${id}.mp4`));assert.ok(statSync(`assets/tree-streak/day-${id}.jpg`).size>0);}
  assert.match(registry,/growthStage\(streak\) === 30 && !recap/);assert.match(registry,/mature.mp4/);
  const manifest=JSON.parse(readFileSync('assets/tree-streak/manifest.json','utf8'));assert.equal(manifest.length,31);assert.ok(manifest.reduce((a,b)=>a+b.bytes,0)<30*1048576);
});
test('mixed histories roundtrip with tree cycles and partial-day loss', () => {
  let p=initial();for(let n=0;n<400;n++){
    p=model.applyReceipts(p,n%55<40 ? receipts(n) : n%2 ? [receipts(n)[0]] : [],now(n));check(p);
    assert.deepEqual(model.applyReceipts(p,[],now(n)),p);
  }
});
test('playback priority consumes interruptions and does not queue retries beneath celebrations', async () => {
  const { createTreePlaybackController } = await import('../src/features/progress/tree/session-model.ts');
  const c=createTreePlaybackController();c.request('entry',2);assert.equal(c.owner(),'entry');
  c.request('replay',1);assert.equal(c.owner(),'entry');c.request('recovery',3);assert.equal(c.owner(),'recovery');
  c.request('celebration',4);assert.equal(c.owner(),'celebration');c.release('celebration');assert.equal(c.owner(),null);
  c.request('entry2',2);c.release('entry2');assert.equal(c.owner(),null);
});
test('transition claims are durable, serialized, profile scoped and fail closed', async () => {
  const { createTransitionPresentation } = await import('../src/features/progress/tree/session-model.ts');
  const values=new Map(), storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>values.set(k,v)};
  const c=createTransitionPresentation(storage);
  assert.deepEqual(await Promise.all([c.claim('one',2),c.claim('one',2)]),[true,false]);
  assert.equal(await createTransitionPresentation(storage).claim('one',2),false);assert.equal(await c.claim('two',2),true);
  for (const broken of [{getItem:async()=>{throw Error('read');},setItem:async()=>{}},{getItem:async()=>null,setItem:async()=>{throw Error('write');}},{getItem:async()=>'{broken',setItem:async()=>{}}]) assert.equal(await createTransitionPresentation(broken).claim('one',3),false);
});
test('v2 pending receipts recover before migration without duplicate imported bonuses', () => {
  let old=v2.emptyDailyProgress(new Date('2026-01-01T00:00:00Z'),'UTC');for(let n=0;n<6;n++)old=v2.applyReceipts(old,receipts(n),now(n));
  const p=model.migrateDailyProgress(old,receipts(6),now(7),'UTC');assert.equal(p.tree.level,7);assert.deepEqual(p.tree.bonuses,[7]);assert.equal(p.balance,180);assert.equal(p.tree.revision,0);check(p);
  const missed=model.settle(p,day(8));assert.equal(missed.tree.level,6);
  const regrown=earn(missed,8);assert.equal(regrown.tree.level,7);assert.equal(regrown.ledger.filter(e=>e.kind==='milestone').length,1);check(regrown);
});
