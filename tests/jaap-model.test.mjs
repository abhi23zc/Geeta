import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyJaap, reduceJaap, parseJaap, activeSession, beadPosition, todayTarget } from '../src/features/jaap/model.ts';
import { validPull } from '../src/features/jaap/gesture.ts';
import { createJaapRepository } from '../src/features/jaap/repository-core.ts';
import { emptyDailyProgress, applyReceipts, parseDailyProgress, migrateDailyProgress, settle } from '../src/features/progress/model.ts';
import * as v3 from '../src/features/progress/v3-model.ts';
const at='2026-10-20T10:00:00.000Z', timezone='Asia/Kolkata';
const start=()=>reduceJaap(emptyJaap(),{type:'start',id:'session',at,timezone});
const count=(s,id,when=at)=>reduceJaap(s,{type:'count',id,at:when,timezone});
const counts=(s,n,prefix='c')=>{for(let i=0;i<n;i++)s=count(s,`${prefix}${i}`);return s;};
const roundtrip=s=>assert.deepEqual(parseJaap(JSON.stringify(s)),s);
test('reset returns the session count to zero, corrects the day total, and is idempotent per id',()=>{
 let s=counts(start(),30);
 assert.equal(activeSession(s).total,30);assert.equal(s.days['2026-10-20'].total,30);
 s=reduceJaap(s,{type:'reset',id:'reset1',at,timezone});
 assert.equal(activeSession(s).total,0);assert.equal(s.days['2026-10-20'].total,0);
 assert.deepEqual(reduceJaap(s,{type:'reset',id:'reset1',at,timezone}),s);
 assert.deepEqual(reduceJaap(s,{type:'reset',id:'reset2',at,timezone}),s);
 s=count(s,'after-reset');assert.equal(activeSession(s).total,1);roundtrip(s);
});
test('reset keeps an earned daily bonus but can be re-earned, and respects earlier undos',()=>{
 let s=counts(start(),108);assert.equal(s.days['2026-10-20'].bonus,true);
 s=reduceJaap(s,{type:'undo',id:'u',at,timezone});assert.equal(activeSession(s).total,107);
 s=reduceJaap(s,{type:'reset',id:'r',at,timezone});
 assert.equal(activeSession(s).total,0);assert.equal(s.days['2026-10-20'].total,0);
 assert.equal(s.pendingRewards.filter(x=>x.kind==='jaap').length,1);roundtrip(s);
});
test('all 108 beads wrap without counting the guru, and material changes preserve progress',()=>{
 let s=counts(start(),107);assert.equal(beadPosition(activeSession(s).total),107);
 s=count(s,'108');assert.equal(beadPosition(activeSession(s).total),108);
 s=count(s,'109');assert.equal(beadPosition(activeSession(s).total),1);
 s=reduceJaap(s,{type:'preferences',patch:{material:'crystal'}});assert.equal(activeSession(s).total,109);roundtrip(s);
});
test('one operation can never count twice, and undo crosses a mala boundary',()=>{
 let s=counts(start(),109);assert.deepEqual(count(s,'c108'),s);
 s=reduceJaap(s,{type:'undo',id:'undo',at,timezone});assert.equal(activeSession(s).total,108);assert.equal(beadPosition(activeSession(s).total),108);
 s=reduceJaap(s,{type:'undo',id:'undo2',at,timezone});assert.equal(activeSession(s).total,107);assert.equal(s.days['2026-10-20'].bonus,true);
 s=count(s,'again');assert.equal(s.pendingRewards.filter(r=>r.kind==='jaap').length,1);roundtrip(s);
});
test('pause excludes inactive duration; finish snapshots mantra and blocks counting',()=>{
 let s=start();s=count(s,'one');s=reduceJaap(s,{type:'pause',at:'2026-10-20T10:01:00Z'});
 assert.equal(activeSession(s).activeMs,60000);assert.throws(()=>count(s,'blocked'));
 s=reduceJaap(s,{type:'resume',at:'2026-10-20T11:00:00Z'});s=reduceJaap(s,{type:'finish',at:'2026-10-20T11:02:00Z'});
 assert.equal(s.sessions[0].activeMs,180000);assert.equal(activeSession(s),null);assert.throws(()=>count(s,'blocked2'));roundtrip(s);
});
test('midnight splits daily totals and undo corrects the count on its original day',()=>{
 let s=start();s=count(s,'before','2026-10-20T18:29:59Z');s=count(s,'after','2026-10-20T18:30:01Z');
 assert.equal(s.days['2026-10-20'].total,1);assert.equal(s.days['2026-10-21'].total,1);assert.equal(activeSession(s).total,2);
 s=reduceJaap(s,{type:'undo',id:'undo',at:'2026-10-21T10:00:00Z',timezone});s=reduceJaap(s,{type:'undo',id:'undo2',at:'2026-10-21T10:00:01Z',timezone});
 assert.equal(s.days['2026-10-20'].total,0);assert.equal(s.days['2026-10-21'].total,0);roundtrip(s);
});
test('daily bonus aggregates across sessions and mantras exactly once',()=>{
 let s=counts(start(),54);s=reduceJaap(s,{type:'finish',at});s=reduceJaap(s,{type:'preferences',patch:{mantraId:'radha'}});s=reduceJaap(s,{type:'start',id:'session2',at,timezone});s=counts(s,54,'other');
 assert.equal(s.pendingRewards.filter(r=>r.kind==='jaap').length,1);assert.equal(s.days['2026-10-20'].mantras.radha,54);roundtrip(s);
});
test('flexible daily target tracks the day total and never resets missed days',()=>{
 let s=counts(start(),108,'before');
 assert.equal(todayTarget(s,'2026-10-20').count,108);
 assert.equal(todayTarget(s,'2026-10-20').target,108);
 s=reduceJaap(s,{type:'finish',at});
 s=reduceJaap(s,{type:'preferences',patch:{dailyMalas:2}});
 assert.equal(todayTarget(s,'2026-10-20').target,216);roundtrip(s);
});
test('pull threshold rejects reversals, sideways motion, cancellations, and multitouch',()=>{
 assert.equal(validPull(0,40,40,1),true);assert.equal(validPull(10,65,65,1),true);
 for(const args of [[0,39,39,1],[29,45,45,1],[0,45,80,1],[0,50,50,2],[0,50,50,1,true]])assert.equal(validPull(...args),false);
});
test('transactional repository serializes updates and preserves committed data after a failed save',async()=>{
 let raw=JSON.stringify(start()),fail=false;
 const repo=createJaapRepository({async read(){return raw;},async mutate(update){const next=update(raw);if(fail)throw Error('disk full');raw=next;return next;}});
 await Promise.all(Array.from({length:20},(_,i)=>repo.dispatch({type:'count',id:`parallel${i}`,at,timezone})));
 assert.equal(activeSession(await repo.load()).total,20);fail=true;
 await assert.rejects(repo.dispatch({type:'count',id:'retryable',at,timezone}));assert.equal(activeSession(await repo.load()).total,20);
 fail=false;await repo.dispatch({type:'count',id:'retryable',at,timezone});await repo.dispatch({type:'count',id:'retryable',at,timezone});assert.equal(activeSession(await repo.load()).total,21);
});
test('unreadable saved data never becomes an empty practice',()=>{
 assert.throws(()=>parseJaap('{bad'));assert.throws(()=>parseJaap(JSON.stringify({...emptyJaap(),version:99})));
 const s=count(start(),'one');s.sessions[0].total=-1;assert.throws(()=>parseJaap(JSON.stringify(s)));
});
const q=date=>({id:`q:${date}`,kind:'quiz',completedAt:`${date}T10:00:00Z`});
const r=date=>({id:`r:${date}`,kind:'ritual',startedAt:`${date}T06:00:00Z`,breathingAt:`${date}T06:05:00Z`,completedAt:`${date}T06:10:00Z`});
test('jaap-only activity protects points but never satisfies tree growth',()=>{
 let p=emptyDailyProgress(new Date('2026-10-19T00:00:00Z'),'UTC');p=applyReceipts(p,[q('2026-10-19'),r('2026-10-19')],new Date('2026-10-19T20:00:00Z'));
 p=applyReceipts(p,[{id:'jaap-active:2026-10-20',kind:'jaap-active',completedAt:at},{id:'jaap:2026-10-20',kind:'jaap',completedAt:at}],new Date('2026-10-20T20:00:00Z'));
 assert.equal(p.balance,30);assert.equal(p.tree.level,1);assert.equal(p.days['2026-10-20'].rewarded,false);
 p=settle(p,'2026-10-21');assert.equal(p.balance,30);assert.equal(p.tree.level,0);assert.equal(p.current,0);
 assert.deepEqual(parseDailyProgress(JSON.stringify(p),new Date('2026-10-21T20:00:00Z'),'UTC'),p);
});
test('reward replay cannot duplicate a bonus, including after acknowledgement failures',()=>{
 const receipts=counts(start(),108).pendingRewards;let p=emptyDailyProgress(new Date('2026-10-20T00:00:00Z'),timezone);
 p=applyReceipts(p,receipts,new Date(at));assert.equal(p.balance,10);assert.deepEqual(applyReceipts(p,receipts,new Date(at)),p);assert.deepEqual(parseDailyProgress(JSON.stringify(p),new Date(at),timezone),p);
});
test('version-three migration preserves all balances and historical tree state',()=>{
 let old=v3.emptyDailyProgress(new Date('2026-10-19T00:00:00Z'),'UTC');old=v3.applyReceipts(old,[q('2026-10-19'),r('2026-10-19')],new Date('2026-10-19T20:00:00Z'));
 const migrated=migrateDailyProgress(old,[],new Date('2026-10-20T10:00:00Z'),'UTC');assert.equal(migrated.version,4);assert.deepEqual(migrated,{...old,version:4});assert.deepEqual(parseDailyProgress(JSON.stringify(migrated),new Date('2026-10-20T10:00:00Z'),'UTC'),migrated);
});
