import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createJaapRepository } from '../src/features/jaap/repository-core.ts';
import { activeSession } from '../src/features/jaap/model.ts';
function nativeRepository(){
 const db=new DatabaseSync(':memory:');let fail=false;
 const tx={async getFirstAsync(sql,...args){return db.prepare(sql).get(...args)??null;},async runAsync(sql,...args){if(fail&&sql.startsWith('INSERT INTO jaap_state'))throw Error('disk full');return db.prepare(sql).run(...args);}};
 const connection={...tx,async execAsync(sql){db.exec(sql);},async withExclusiveTransactionAsync(operation){db.exec('BEGIN IMMEDIATE');try{await operation(tx);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};
 const output=ts.transpileModule(readFileSync(new URL('../src/features/jaap/database.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(output,{exports,require:n=>({'expo-sqlite':{openDatabaseAsync:async()=>connection},'./repository-core':{createJaapRepository}}[n]??{})});
 return {repo:exports.jaapRepository,db,fail:()=>{fail=true;},recover:()=>{fail=false;}};
}
const at='2026-10-20T10:00:00Z',timezone='UTC';
test('native SQLite commits events, state, and operation markers together',async()=>{
 const {repo,db}=nativeRepository();await repo.dispatch({type:'start',id:'session',at,timezone});
 await Promise.all(Array.from({length:108},(_,i)=>repo.dispatch({type:'count',id:`c${i}`,at,timezone})));
 assert.equal(activeSession(await repo.load()).total,108);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jaap_events').get().n,108);
 assert.equal((await repo.pending()).filter(x=>x.kind==='jaap').length,1);
 await repo.dispatch({type:'ack',ids:['jaap:2026-10-20','jaap-active:2026-10-20']});assert.equal((await repo.pending()).length,0);db.close();
});
test('native SQLite rolls back the event and operation marker when the snapshot save fails',async()=>{
 const s=nativeRepository();await s.repo.dispatch({type:'start',id:'session',at,timezone});s.fail();
 await assert.rejects(s.repo.dispatch({type:'count',id:'retry',at,timezone}));assert.equal(activeSession(await s.repo.load()).total,0);
 assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM jaap_events').get().n,0);assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM jaap_operations WHERE id=?').get('retry').n,0);
 s.recover();await s.repo.dispatch({type:'count',id:'retry',at,timezone});assert.equal(activeSession(await s.repo.load()).total,1);s.db.close();
});
test('history remains durable after pruning the active event cache and old operations cannot replay',async()=>{
 const {repo,db}=nativeRepository();await repo.dispatch({type:'start',id:'session',at,timezone});await repo.dispatch({type:'count',id:'one',at,timezone});await repo.dispatch({type:'finish',at});
 await repo.dispatch({type:'start',id:'session2',at,timezone});let s=await repo.load();assert.equal(s.events.length,0);assert.equal(s.sessions[0].dayCounts['2026-10-20'],1);
 await repo.dispatch({type:'count',id:'one',at,timezone});s=await repo.load();assert.equal(activeSession(s).total,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jaap_events').get().n,1);db.close();
});
