import {Buffer} from 'node:buffer';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID,createHash} from 'node:crypto';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=ts.transpileModule(readFileSync(new URL('../firebase/functions/index.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const asset={id:'asset1',url:'https://storage.googleapis.com/demo/asset1',mimeType:'audio/mpeg',bytes:1000,sha256:'a'.repeat(64),durationMs:5000};
const practice={id:'10-21',revision:'v1',kind:'gita',chapter:10,verse:'21',theme:'Theme',sanskrit:'श्लोक',transliteration:'Shlok',meaning:'Meaning',takeaway:'Takeaway',context:'Context',reflectionPrompt:'Prompt',words:[],narration:{asset,completionMs:5000,segments:[{kind:'sanskrit',text:'श्लोक',startMs:0,endMs:2000},{kind:'meaning',text:'Meaning',startMs:2500,endMs:5000}]}};
function harness(existing=true){
 const alarms=[{key:'gita',revision:'tone1',title:'Morning',description:'Music',asset}];
 const docs=new Map([['assets/asset1',{asset,path:'validated/asset1.audio'}]]);
 if(existing){docs.set('delivery/current',{releaseId:'old',enabled:false});docs.set('releases/old',{schedule:{'2026-10-10':practice},alarms});}
 const ref=path=>({path,get:async()=>({exists:docs.has(path),data:()=>structuredClone(docs.get(path))})});
 let race=false;
 const db={doc:ref,runTransaction:async fn=>{
   if(race) docs.set('delivery/current',{releaseId:'concurrent'});
   const writes=[];await fn({get:r=>r.get(),create:(r,v)=>writes.push([r.path,v]),set:(r,v)=>writes.push([r.path,v])});
   writes.forEach(([p,v])=>docs.set(p,structuredClone(v)));
 }};
 const mocks={
 'firebase-admin/app':{initializeApp:()=>{}},'firebase-admin/auth':{getAuth:()=>({verifyIdToken:async token=>{if(token!=='valid') throw new Error('bad token');return {admin:true,uid:'editor'};}})},
 'firebase-admin/firestore':{getFirestore:()=>db},'firebase-admin/storage':{getStorage:()=>({bucket:()=>({name:'demo',file:()=>({exists:async()=>[true],getMetadata:async()=>[{metadata:{firebaseStorageDownloadTokens:'token'}}]})})})},
 'firebase-functions/v2/https':{onRequest:(_opts,fn)=>fn},'firebase-functions/v2/scheduler':{onSchedule:()=>{}},'firebase-functions':{logger:{error:()=>{}}},'node:crypto':{randomUUID,createHash},'../../shared/content':require('../shared/content.ts')};
 const publisher={};runInNewContext(ts.transpileModule(readFileSync(new URL('../firebase/functions/content-publisher.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:publisher,require:n=>mocks[n],Buffer,Date,Error});mocks['./content-publisher']=publisher;
 const exports={};runInNewContext(source,{exports,require:n=>mocks[n],Buffer,Date,Intl,Error});
 return {docs,alarms,race:()=>{race=true;},post:async(body,token='valid',path='/api/admin/publish-day')=>{
  let status=200,result;const res={status:s=>{status=s;return res;},json:v=>{result=v;return res;}};
  await exports.contentApi({path,method:'POST',headers:{authorization:`Bearer ${token}`},body},res);return {status,result};
 }};
}
test('single-day publication preserves existing assignments, tones, pause state and old immutable release',async()=>{
 const h=harness(),r=await h.post({date:'2026-10-11',practice,expectedReleaseId:'old',alarms:[]});assert.equal(r.status,200);
 const next=h.docs.get(`releases/${r.result.releaseId}`);assert.equal(Object.keys(next.schedule).length,2);assert.equal(next.schedule['2026-10-11'].id,'10-21');assert.deepEqual(next.alarms,h.alarms);assert.equal(h.docs.get('delivery/current').enabled,false);assert.equal(Object.keys(h.docs.get('releases/old').schedule).length,1);
 assert.match(next.schedule['2026-10-11'].narration.asset.url,/token=token/);
});
test('single-day first release needs only its teaching and no alarm uploads',async()=>{
 const h=harness(false),r=await h.post({date:'2026-10-11',practice,expectedReleaseId:null});assert.equal(r.status,200);assert.deepEqual(h.docs.get(`releases/${r.result.releaseId}`).alarms,[]);
});
test('reject invalid dates, unverified assets and unauthorized publication without changing active release',async()=>{
 const h=harness();for(const [body,token] of [[{date:'2026-02-30',practice,expectedReleaseId:'old'},'valid'],[{date:'2026-10-11',practice:{...practice,narration:{...practice.narration,asset:{...asset,id:'unknown'}}},expectedReleaseId:'old'},'valid'],[{date:'2026-10-11',practice,expectedReleaseId:'old'},'invalid']]){
  const r=await h.post(body,token);assert.ok(r.status>=400);assert.equal(h.docs.get('delivery/current').releaseId,'old');
 }
});
test('both stale editor and concurrent transaction conflicts reject publication',async()=>{
 for(const concurrent of [false,true]){const h=harness();if(concurrent)h.race();const r=await h.post({date:'2026-10-11',practice,expectedReleaseId:concurrent?'old':'stale'});assert.equal(r.status,400);assert.match(r.result.error,/Another admin/);assert.equal([...h.docs.keys()].filter(k=>k.startsWith('releases/')).length,1);}
});

test('cycle publication preserves teachings and modes, generates a revision, and remains independent of teaching publication',async()=>{
 const h=harness();const cycle={key:'gita',revision:'draft',startDate:'2026-10-19',tracks:[{title:'First',asset},{title:'Second',asset}]};
 const publish=(body,token='valid')=>h.post(body,token,'/api/admin/publish-alarm-cycle');
 assert.equal((await publish({cycle,expectedReleaseId:'old'},'invalid')).status,403);
 const r=await publish({cycle,expectedReleaseId:'old'});assert.equal(r.status,200);
 const next=h.docs.get(`releases/${r.result.releaseId}`);assert.equal(next.alarmCycles[0].tracks.length,2);assert.notEqual(next.alarmCycles[0].revision,'draft');assert.equal(next.alarms[0].title,'First');assert.ok(next.schedule['2026-10-10']);assert.equal(h.docs.get('delivery/current').enabled,false);
 const second=await publish({cycle:{...cycle,key:'shankh'},expectedReleaseId:r.result.releaseId});assert.equal(second.status,200);
 const teaching=await h.post({date:'2026-10-11',practice,expectedReleaseId:second.result.releaseId});assert.equal(teaching.status,200);
 assert.equal(h.docs.get(`releases/${teaching.result.releaseId}`).alarmCycles.length,2);
 const stale=await publish({cycle,expectedReleaseId:'old'});assert.equal(stale.status,400);
 const invalid=await publish({cycle:{...cycle,tracks:[]},expectedReleaseId:teaching.result.releaseId});assert.equal(invalid.status,400);
 assert.equal(h.docs.get('delivery/current').releaseId,teaching.result.releaseId);
});

test('image publication preserves teachings, survives other publications, and rejects unauthorized, stale or unvalidated edits', async () => {
 const h = harness();
 const image = { id:'image-one', url:'https://storage.googleapis.com/demo/image.webp', mimeType:'image/webp', bytes:20, sha256:'b'.repeat(64), width:100, height:100 };
 h.docs.set(`assets/${image.id}`, { asset:image, path:'published/image-one.webp' });
 const cycle = { revision:'image-r1', startDate:'2026-10-19', images:[image,...Array(6).fill(null)] };
 const post = (body, token='valid') => h.post(body, token, '/api/admin/publish-alarm-images');
 assert.equal((await post({cycle,expectedReleaseId:'old'},'invalid')).status,403);
 const published = await post({cycle,expectedReleaseId:'old'}); assert.equal(published.status,200);
 const next = h.docs.get(`releases/${published.result.releaseId}`);
 assert.equal(next.alarmImageCycle.images.length,7); assert.ok(next.schedule['2026-10-10']); assert.deepEqual(next.alarms,h.alarms);
 const teaching = await h.post({date:'2026-10-11',practice,expectedReleaseId:published.result.releaseId}); assert.equal(teaching.status,200);
 assert.equal(h.docs.get(`releases/${teaching.result.releaseId}`).alarmImageCycle.revision,'image-r1');
 const music = await h.post({cycle:{key:'gita',revision:'music',startDate:'2026-10-19',tracks:[{title:'First',asset}]},expectedReleaseId:teaching.result.releaseId}, 'valid', '/api/admin/publish-alarm-cycle');
 assert.equal(music.status,200); assert.equal(h.docs.get(`releases/${music.result.releaseId}`).alarmImageCycle.revision,'image-r1');
 assert.equal((await post({cycle,expectedReleaseId:'old'})).status,400);
 assert.equal((await post({cycle:{...cycle,images:[{...image,sha256:'c'.repeat(64)},...Array(6).fill(null)]},expectedReleaseId:music.result.releaseId})).status,400);
 const empty = await post({cycle:{...cycle,revision:'empty',images:Array(7).fill(null)},expectedReleaseId:music.result.releaseId}); assert.equal(empty.status,200);
 assert.ok(h.docs.get(`releases/${empty.result.releaseId}`).alarmImageCycle.images.every(v=>v===null));
});
