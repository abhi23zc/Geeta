import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {emptySnapshot} from '../src/services/music/model.ts';
const m={listeners:new Set(),s:emptySnapshot(),epoch:0,commits:[],resolve:async t=>({uri:t.id})};
m.emit=patch=>{m.s={...m.s,...patch,invalidation:m.epoch};for(const fn of m.listeners)fn(m.s);};
m.native={addListener(_,fn){m.listeners.add(fn);return{remove:()=>m.listeners.delete(fn)};},async initialize(){m.emit({});},async snapshot(){return m.s;},async beginQueue(){m.epoch++;m.emit({...emptySnapshot(),interruption:'queue-replacement'});return m.epoch;},async replaceQueue(json,id,play,epoch){if(epoch!==m.epoch)throw Error('Interrupted');m.commits.push(id);m.emit({queue:JSON.parse(json),entryId:id,state:play?'playing':'paused',seekable:true,durationMs:1000,interruption:null});},async command(name,value){if(name==='seek')m.emit({positionMs:Number(value),seeking:false});if(['pause','stop'].includes(name)){m.epoch++;m.emit({state:'paused',interruption:value??'stop'});}},async setOwner(){}};
globalThis.__nativeMusicTest=m;
const hook=registerHooks({resolve(specifier,context,next){let code;if(specifier==='expo-modules-core')code='export const requireOptionalNativeModule=()=>globalThis.__nativeMusicTest.native';if(specifier==='expo-asset')code='export const Asset={fromModule:()=>({uri:"file:///asset",downloadAsync:async()=>{}})}';if(specifier==='../music-downloads')code='export const resolveNativeQueueSource=async(...a)=>(await globalThis.__nativeMusicTest.resolve(...a)).uri;export const pinMusicFile=()=>()=>{};export const quarantineMusicAsset=async()=>{}';if(code)return{url:`data:text/javascript,${encodeURIComponent(code)}`,shortCircuit:true};if(specifier==='./seek-controller')return next('./seek-controller.ts',context);if(specifier==='./model')return next('./model.ts',context);return next(specifier,context);}});
const{NativeMusicAdapter}=await import('../src/services/music/native-adapter.ts');hook.deregister();
const q=()=>['a','b'].map((id,i)=>({entryId:`e${i}`,track:{id,revision:'r1',availability:'available',durationMs:1000}}));
const wait=()=>new Promise(r=>setImmediate(r));
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
async function harness(){m.s=emptySnapshot();m.epoch=0;m.commits=[];m.listeners.clear();m.resolve=async t=>({uri:t.id});const a=new NativeMusicAdapter();await wait();return a;}
test('native pending selection survives old snapshots and failed resolution stays selected',async()=>{const a=await harness();m.resolve=async()=>{throw Error('Offline');};await a.replaceQueue(q(),'e1');m.emit({entryId:null,state:'idle'});assert.equal(a.getSnapshot().entryId,'e1');assert.equal(a.getSnapshot().state,'failed');assert.match(a.getSnapshot().error,/Offline/);m.resolve=async t=>({uri:t.id});await a.play();assert.equal(a.getSnapshot().entryId,'e1');assert.equal(a.getSnapshot().state,'playing');a.dispose();});
test('native timer expiry invalidates pending source even when the same sleep reason repeats',async()=>{const a=await harness(),d=defer();m.resolve=()=>d.promise;const play=a.replaceQueue(q(),'e0');await wait();m.epoch++;m.emit({interruption:'sleep',state:'paused',timer:null});d.resolve({uri:'a'});await play;assert.equal(m.commits.length,0);assert.equal(a.getSnapshot().state,'paused');a.dispose();});
test('native rapid selection and Stop cannot commit stale queues',async()=>{const a=await harness(),d=defer();m.resolve=t=>t.id==='a'?d.promise:Promise.resolve({uri:'b'});const first=a.replaceQueue([q()[0]],'e0');await wait();await a.replaceQueue([q()[1]],'e1');d.resolve({uri:'a'});await first;assert.deepEqual(m.commits,['e1']);const x=defer();m.resolve=()=>x.promise;const pending=a.replaceQueue(q(),'e0');await wait();a.stop();await wait();x.resolve({uri:'a'});await pending;assert.deepEqual(m.commits,['e1']);a.dispose();});

test('native queue selection dispatches unique entry without replacing the queue',async()=>{
  const a=await harness();await a.replaceQueue(q(),'e0');const commits=m.commits.length,command=m.native.command,calls=[];
  m.native.command=async(name,value)=>{calls.push([name,value]);if(name==='select')m.emit({entryId:value,state:'playing'});else await command(name,value);};
  try{await a.selectEntry('e1');assert.deepEqual(calls,[['select','e1']]);assert.equal(m.commits.length,commits);assert.equal(a.getSnapshot().entryId,'e1');}finally{m.native.command=command;a.dispose();}
});

test('native failure retry uses the service without replacing queue or history',async()=>{
  const a=await harness();await a.replaceQueue(q(),'e0');m.emit({state:'failed',positionMs:700,error:'Network'});
  const commits=m.commits.length,command=m.native.command,calls=[];
  m.native.command=async(name,value)=>{calls.push([name,value]);await command(name,value);};
  try{await a.play();assert.deepEqual(calls,[['play',null]]);assert.equal(m.commits.length,commits);assert.equal(a.getSnapshot().positionMs,700);}finally{m.native.command=command;a.dispose();}
});
test('native seeks preserve optimistic position until service confirms',async()=>{
  const a=await harness();await a.replaceQueue(q(),'e0');const command=m.native.command;
  m.native.command=async(name,value)=>{if(name==='seek')m.emit({positionMs:Number(value),seeking:true});else await command(name,value);};
  try{const pending=a.seek(800);await wait();m.emit({positionMs:0,seeking:true});assert.equal(a.getSnapshot().positionMs,800);m.emit({positionMs:800,seeking:false});await pending;assert.equal(a.getSnapshot().seeking,false);}finally{m.native.command=command;a.dispose();}
});
test('native session restoration can submit a saved position before timeline readiness',async()=>{
  const a=await harness();await a.replaceQueue(q(),'e0',false);m.emit({seekable:false,state:'loading'});
  await a.seek(700);assert.equal(a.getSnapshot().positionMs,700);a.dispose();
});
