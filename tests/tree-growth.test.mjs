import assert from 'node:assert/strict';
import { test } from 'node:test';
import { growthStage, growthEvent, createGrowthPresentation } from '../src/features/progress/tree/model.ts';
import { emptyDailyProgress, applyReceipts, shiftDay, settle } from '../src/features/progress/model.ts';
const date = '2026-10-08';
const initial = () => emptyDailyProgress(new Date(`${date}T00:00:00Z`), 'UTC');
const receipts = day => [
  { id: `q:${day}`, kind: 'quiz', completedAt: `${day}T12:00:00Z` },
  { id: `r:${day}`, kind: 'ritual', startedAt: `${day}T06:00:00Z`, breathingAt: `${day}T06:05:00Z`, completedAt: `${day}T06:10:00Z` },
];
const earn = (p, day) => applyReceipts(p, receipts(day), new Date(`${day}T18:00:00Z`));
const memory = () => { const values = new Map(); return { values, getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { values.set(k, v); } }; };
test('visual stages clamp without changing actual streak values', () => {
  for (const [n, expected] of [[0,0],[-1,0],[1,1],[3,3],[7,7],[15,15],[30,30],[31,30],[400,30],[NaN,0]]) assert.equal(growthStage(n), expected);
});
test('both activity orders trigger once, partials and migration never trigger', () => {
  for (const events of [receipts(date), receipts(date).reverse()]) {
    const old = initial();
    const partial = applyReceipts(old, [events[0]], new Date(`${date}T18:00:00Z`));
    assert.equal(growthEvent(old, partial, date), null);
    const next = applyReceipts(partial, events, new Date(`${date}T18:00:00Z`));
    assert.deepEqual(growthEvent(partial, next, date), { id: `${old.createdAt}:${date}`, profile: old.createdAt, date, streak: 1, level: 1, cycle: 1, lost: 0, dailyPoints: 20, bonus: 0 });
    assert.equal(growthEvent(next, next, date), null);
    assert.equal(growthEvent(partial, next, date, true), null);
    assert.equal(growthEvent(partial, next, shiftDay(date, 1)), null);
  }
});
test('first milestones display actual bonus, repeated milestones do not', () => {
  let p = initial();
  for (let n = 0; n < 30; n++) {
    const day = shiftDay(date,n), next = earn(p,day), e = growthEvent(p,next,day);
    assert.equal(e.bonus, n===6 ? 40 : n===29 ? 100 : 0); p=next;
  }
  p=settle(p,shiftDay(date,32));
  for(let n=32;n<62;n++) { const day=shiftDay(date,n),next=earn(p,day);assert.equal(growthEvent(p,next,day).bonus,n===38 ? 40 : n===61 ? 100 : 0);p=next; }
});
test('acknowledgment is durable, claims serialized, reopening does not replay', async () => {
  const storage=memory(), controller=createGrowthPresentation(storage), old=initial(),next=earn(old,date);
  const e=await controller.observe(old,next,date);
  const claims=await Promise.all([controller.claim(e.id,date),controller.claim(e.id,date)]);
  assert.equal(claims.filter(Boolean).length,1);
  const reopened=createGrowthPresentation(storage);
  assert.equal(await reopened.observe(old,next,date),null);
});
test('existing history baselines silently and later completion still queues', async () => {
  const storage=memory(), controller=createGrowthPresentation(storage),existing=earn(initial(),date);
  assert.equal(await controller.observe(existing,existing,date,true),null);
  const tomorrow=shiftDay(date,1),next=earn(existing,tomorrow);
  assert.equal((await controller.observe(existing,next,tomorrow)).streak,2);
});
test('stale events expire and migration does not celebrate', async () => {
  const controller=createGrowthPresentation(memory()),old=initial(),next=earn(old,date);
  const e=await controller.observe(old,next,date);
  assert.equal(await controller.claim(e.id,shiftDay(date,1)),null);
  assert.equal(await controller.observe(next,next,shiftDay(date,1)),null);
  assert.equal(await createGrowthPresentation(memory()).observe(old,next,date,true),null);
});
test('read, write, and malformed-marker failures never escape into reward logic', async () => {
  const old=initial(),next=earn(old,date);
  for (const storage of [
    {getItem:async()=>{throw Error('read');},setItem:async()=>{}},
    {getItem:async()=>'{broken',setItem:async()=>{}},
    {getItem:async()=>null,setItem:async()=>{throw Error('write');}},
  ]) {
    const controller=createGrowthPresentation(storage),e=await controller.observe(old,next,date);
    if(e)assert.equal(await controller.claim(e.id,date),null);
    assert.equal(await controller.observe(next,next,date),null);
    assert.equal(next.balance,20);
  }
});
test('a new progress profile gets independent presentation state', async () => {
  const controller=createGrowthPresentation(memory()),old=initial(),next=earn(old,date);
  const e=await controller.observe(old,next,date);await controller.claim(e.id,date);
  const other={...initial(),createdAt:`${date}T00:01:00Z`};
  assert.notEqual((await controller.observe(other,earn(other,date),date)).id,e.id);
});
test('a crash after reward save recovers the latest unacknowledged growth and its loss summary', async () => {
  let p=initial();for(let n=0;n<12;n++)p=earn(p,shiftDay(date,n));
  const today=shiftDay(date,14), next=earn(p,today);
  const storage=memory(), controller=createGrowthPresentation(storage);
  const event=await controller.observe(next,next,today);
  assert.equal(event.level,11);assert.equal(event.streak,1);assert.equal(event.lost,2);
  await controller.claim(event.id,today);
  assert.equal(await createGrowthPresentation(storage).observe(next,next,today),null);
});
