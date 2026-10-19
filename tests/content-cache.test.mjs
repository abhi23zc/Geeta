import test from 'node:test';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync, unlinkSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dateWindow } from '../shared/content.ts';
const require = createRequire(import.meta.url), ts = require('typescript');
const source = ts.transpileModule(readFileSync(new URL('../src/services/content-cache.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness() {
  const root=mkdtempSync(join(tmpdir(),'geeta-cache-test-')), sqlite=new DatabaseSync(':memory:');
  let nativeCycle=null, nativeFailure=false, nativeHealthy=true, selectedKey='gita';
  let today='2026-10-03', manifest, network=true, networkType='wifi', free=1024*1024*1024, ritualCheckpoint=null;
  const payloads=new Map(), downloads=[], installs=[];
  class File {
    constructor(...parts) { this.path=join(...parts.map(p => typeof p==='string' ? p.startsWith('file:') ? fileURLToPath(p) : p : p.path)); }
    get uri(){return pathToFileURL(this.path).href;} get name(){return basename(this.path);} get exists(){return existsSync(this.path);} get size(){return statSync(this.path).size;}
    delete(){unlinkSync(this.path);} move(other){renameSync(this.path,other.path); this.path=other.path;}
  }
  class Directory extends File { create(){mkdirSync(this.path,{recursive:true});} list(){return readdirSync(this.path).map(n=>new File(this,n));} }
  const d={execAsync:async sql=>sqlite.exec(sql),runAsync:async (sql,...args)=>sqlite.prepare(sql).run(...args),getFirstAsync:async (sql,...args)=>sqlite.prepare(sql).get(...args)??null,getAllAsync:async (sql,...args)=>sqlite.prepare(sql).all(...args)};
  const mocks={
    'expo-file-system':{File,Directory,Paths:{document:new Directory(root),get availableDiskSpace(){return free;}}},
    'expo-file-system/legacy':{createDownloadResumable:(url,uri,_options,progress)=>({cancelAsync:async()=>{},downloadAsync:async()=>{downloads.push(url);const bytes=payloads.get(url);if(!bytes) return {status:404};writeFileSync(fileURLToPath(uri),bytes);progress({totalBytesWritten:bytes.length});return {status:200};}})},
    'expo-sqlite':{openDatabaseAsync:async()=>d},
    'expo-network':{NetworkStateType:{WIFI:'wifi'},getNetworkStateAsync:async()=>({isConnected:network,isInternetReachable:network,type:networkType})},
    'react-native':{Platform:{OS:'android'}},
    '../../shared/content':require('../shared/content.ts'),
    '@/data/gita-verses':{localDateKey:()=>today},
    './alarm':{verifyAlarmCycle:async()=>nativeHealthy,getAlarmMusicStatus:async()=>({key:selectedKey,revision:nativeCycle?.revision??null,pendingRevision:null,bytes:0,fallbackRevision:installs.at(-1)?.revision??null}),installAlarmCycle:async value=>{if(nativeFailure)throw new Error('Native installation interrupted');nativeCycle=structuredClone(value);nativeHealthy=true;},getRitualCheckpoint:()=>ritualCheckpoint,getNativeAlarmConfig:async()=>({tone:{key:selectedKey}}),hashContentFile:async uri=>createHash('sha256').update(readFileSync(fileURLToPath(uri))).digest('hex'),installAlarmTone:async value=>{installs.push(value);}},
  };
  const exports={};
  runInNewContext(source,{exports,require:name=>{if(!(name in mocks))throw new Error(`Unexpected dependency ${name}`);return mocks[name];},process:{env:{EXPO_PUBLIC_CONTENT_API_URL:'https://demo.web.app/api/v1/content-window'}},URL,__DEV__:false,AbortController,setInterval,clearInterval,setTimeout:(fn,ms)=>setTimeout(fn,ms<31000?0:ms),clearTimeout,fetch:async()=>({ok:true,status:200,headers:{get:()=> '"release"'},text:async()=>JSON.stringify(manifest)})});
  function asset(id,body=id){const bytes=Buffer.from(body),url=`https://storage.googleapis.com/demo/${id}`;payloads.set(url,bytes);return{id,url,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,durationMs:5000,mimeType:'audio/mpeg'};}
  function practice(id){return{id,revision:id,kind:'gita',chapter:10,verse:'20',theme:id,sanskrit:'श्लोक',transliteration:'Shloka',meaning:'Meaning',takeaway:'Takeaway',context:'Context',reflectionPrompt:'Prompt',words:[],narration:{asset:asset(id),completionMs:5000,segments:[{kind:'sanskrit',text:'श्लोक',startMs:0,endMs:2000},{kind:'meaning',text:'Meaning',startMs:2500,endMs:5000}]}};}
  function release(start=today){manifest={schemaVersion:1,releaseId:'release',publishedAt:'2026-10-03T00:00:00Z',enabled:true,locale:'hi-IN',days:dateWindow(start).map((date,i)=>({date,practice:practice(`p-${date}`)})),alarms:[{key:'gita',revision:'tone1',title:'Morning',description:'Music',asset:asset('alarm')}]};return manifest;}
  return {root,cache:exports,nativeCycle:()=>nativeCycle,corruptNative:()=>{nativeHealthy=false;},failNative:v=>{nativeFailure=v;},select:v=>{selectedKey=v;},downloads,installs,sqlite,release,practice,asset,setRitualCheckpoint:v=>{ritualCheckpoint=v;},setToday:v=>{today=v;},cellular:()=>{networkType='cellular';},offline:()=>{network=false;},lowDisk:()=>{free=1;},payloads,dispose:()=>{sqlite.close();rmSync(root,{recursive:true,force:true});}};
}
test('seven-day downloads deduplicate and remain readable without connectivity',async()=>{
  const h=harness();try{h.release();await h.cache.syncContent(true);assert.equal(h.downloads.length,8);assert.equal(Object.keys((await h.cache.readContent()).days).length,7);await h.cache.syncContent(true);assert.equal(h.downloads.length,8);h.offline();await h.cache.syncContent(true);assert.match((await h.cache.readContent()).error,/Offline/);assert.equal(Object.keys((await h.cache.readContent()).days).length,7);}finally{h.dispose();}
});
test('rolling refill removes expired audio but preserves saved teaching text',async()=>{
  const h=harness();try{h.release();await h.cache.syncContent(true);await h.cache.saveTeaching((await h.cache.readContent()).days['2026-10-03']);h.setToday('2026-10-04');h.release('2026-10-04');await h.cache.syncContent(true);const s=await h.cache.readContent();assert.equal(s.days['2026-10-03'],undefined);assert.equal(s.saved.length,1);assert.equal(s.saved[0].narration,undefined);assert.equal(h.downloads.length,9);}finally{h.dispose();}
});
test('checksum failure never replaces a verified date revision',async()=>{
  const h=harness();try{h.release();await h.cache.syncContent(true);const m=h.release();const replacement=h.practice('replacement');h.payloads.set(replacement.narration.asset.url,Buffer.from('bad'));m.days[0].practice=replacement;await h.cache.syncContent(true);const s=await h.cache.readContent();assert.equal(s.days['2026-10-03'].id,'p-2026-10-03');assert.match(s.error,/checksum/);}finally{h.dispose();}
});
test('low disk leaves the currently downloaded content intact',async()=>{
  const h=harness();try{h.release();await h.cache.syncContent(true);h.lowDisk();h.setToday('2026-10-04');h.release('2026-10-04');await h.cache.syncContent(true);assert.equal(Object.keys((await h.cache.readContent()).days).length,6);assert.match((await h.cache.readContent()).error,/storage/);}finally{h.dispose();}
});
test('a live database lease prevents a second worker and malformed schedules activate nothing',async()=>{
  const h=harness();try{h.release();h.sqlite.prepare('CREATE TABLE lease(id INTEGER PRIMARY KEY,owner TEXT,expires INTEGER)').run();h.sqlite.prepare('INSERT INTO lease VALUES(1,?,?)').run('other',Date.now()+60000);await h.cache.syncContent(true);assert.equal(h.downloads.length,0);h.sqlite.prepare('UPDATE lease SET expires=0').run();const m=h.release();m.days[0].date='2027-01-01';await h.cache.syncContent(true);assert.equal(h.downloads.length,0);assert.equal(Object.keys((await h.cache.readContent()).days).length,0);}finally{h.dispose();}
});
test('clear downloads preserves a pinned playback file and saved text',async()=>{
  const h=harness();let unpin;try{h.release();await h.cache.syncContent(true);const s=await h.cache.readContent(),v=s.days['2026-10-03'];await h.cache.saveTeaching(v);unpin=h.cache.pinContent(v.narration.assetId);await h.cache.clearContentDownloads();const after=await h.cache.readContent();assert.ok(after.days['2026-10-03']);assert.equal(after.saved.length,1);assert.equal(h.installs.length,1);}finally{unpin?.();await new Promise(r=>setTimeout(r,5));h.dispose();}
});
test('finalized files recover after a crash before metadata commit without downloading twice',async()=>{
  const h=harness();try{h.release();await h.cache.syncContent(true);h.sqlite.prepare('DELETE FROM assets WHERE id=?').run('p-2026-10-03');await h.cache.syncContent(true);assert.equal(h.downloads.length,8);assert.ok((await h.cache.readContent()).days['2026-10-03'].narration);}finally{h.dispose();}
});
test('expired bookmarked audio downloads on demand and its text remains saved',async()=>{
  const h=harness();let release;try{h.release();await h.cache.syncContent(true);await h.cache.saveTeaching((await h.cache.readContent()).days['2026-10-03']);h.setToday('2026-10-04');h.release('2026-10-04');await h.cache.syncContent(true);const replay=await h.cache.prepareSavedReplay('p-2026-10-03');release=replay.release;assert.equal(replay.practice.id,'p-2026-10-03');assert.ok(replay.practice.narration);assert.equal(h.downloads.length,10);assert.equal((await h.cache.readContent()).saved.length,1);}finally{release?.();await new Promise(r=>setTimeout(r,5));h.dispose();}
});
test('an interrupted ritual retains its frozen recording through refill and clear downloads',async()=>{
  const h=harness();try{
    h.release();await h.cache.syncContent(true);
    const practice=(await h.cache.readContent()).days['2026-10-03'];
    h.setRitualCheckpoint({stage:'gita',verse:practice});
    h.setToday('2026-10-04');h.release('2026-10-04');await h.cache.syncContent(true);
    assert.ok(h.sqlite.prepare('SELECT * FROM assets WHERE id=?').get(practice.narration.assetId));
    await h.cache.clearContentDownloads();
    assert.ok(h.sqlite.prepare('SELECT * FROM assets WHERE id=?').get(practice.narration.assetId));
    h.setRitualCheckpoint(null);await h.cache.clearContentDownloads();
    assert.equal(h.sqlite.prepare('SELECT * FROM assets WHERE id=?').get(practice.narration.assetId),undefined);
  }finally{h.dispose();}
});
async function disposeRecording(h, recording) { recording?.release(); await new Promise(resolve => setTimeout(resolve, 5)); h.dispose(); }
function localFile(h, practice) { const row = h.sqlite.prepare('SELECT path FROM assets WHERE id=?').get(practice.narration.assetId); return join(h.root, 'geeta-content', row.path); }
test('missing and same-size corrupt practice recordings repair only the frozen revision', async () => {
  for (const corrupt of [false, true]) {
    const h=harness(); let recording;
    try {
      h.release(); await h.cache.syncContent(true);
      const practice=(await h.cache.readContent()).days['2026-10-03'];
      const path=localFile(h,practice);
      corrupt ? writeFileSync(path,Buffer.alloc(statSync(path).size,120)) : unlinkSync(path);
      const newer=h.practice('newer');
      h.sqlite.prepare('UPDATE days SET json=?,asset=? WHERE date=?').run(JSON.stringify(newer), newer.narration.asset.id, '2026-10-03');
      recording=await h.cache.preparePracticeRecording(practice);
      assert.equal(recording.narration.assetId,practice.narration.assetId);
      assert.equal(h.downloads.length,9);
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),practice.narration.asset.sha256);
      assert.equal((await h.cache.readContent()).days['2026-10-03'].id,'newer');
    } finally { await disposeRecording(h,recording); }
  }
});
test('healthy checksum-verified recordings are reused offline and pins release exactly once', async () => {
  const h=harness(); let recording, other;
  try {
    h.release(); await h.cache.syncContent(true); const practice=(await h.cache.readContent()).days['2026-10-03'];
    h.offline(); recording=await h.cache.preparePracticeRecording(practice); other=await h.cache.preparePracticeRecording(practice);
    assert.equal(h.downloads.length,8);
    recording.release(); recording.release(); await new Promise(resolve=>setTimeout(resolve,5));
    await h.cache.clearContentDownloads(); assert.ok(existsSync(localFile(h,practice)));
    other.release(); other.release(); await new Promise(resolve=>setTimeout(resolve,5));
    await h.cache.clearContentDownloads(); assert.equal(h.sqlite.prepare('SELECT * FROM assets WHERE id=?').get(practice.narration.assetId),undefined);
  } finally { other?.release(); await disposeRecording(h,recording); }
});
test('repair respects offline and Wi-Fi restrictions for corrupt files while preserving text and bookmarks', async () => {
  for (const offline of [true,false]) {
    const h=harness();
    try {
      h.release(); await h.cache.syncContent(true); const practice=(await h.cache.readContent()).days['2026-10-03'];
      await h.cache.saveTeaching(practice);
      writeFileSync(localFile(h,practice),Buffer.alloc(practice.narration.asset.bytes,120));
      offline ? h.offline() : h.cellular(); await h.cache.setWifiOnly(true);
      await assert.rejects(h.cache.preparePracticeRecording(practice),offline ? /Connect to repair/ : /Wi-Fi/);
      assert.equal(h.downloads.length,8); assert.equal((await h.cache.readContent()).saved[0].sanskrit,practice.sanskrit);
    } finally { h.dispose(); }
  }
});
test('repair fails safely under lease contention, checksum failure and low disk', async () => {
  for (const mode of ['lease','checksum','disk']) {
    const h=harness();
    try {
      h.release(); await h.cache.syncContent(true); const practice=(await h.cache.readContent()).days['2026-10-03'];
      unlinkSync(localFile(h,practice));
      if(mode==='lease') h.sqlite.prepare('UPDATE lease SET owner=?,expires=?').run('other',Date.now()+60000);
      if(mode==='checksum') h.payloads.set(practice.narration.asset.url,Buffer.alloc(practice.narration.asset.bytes,120));
      if(mode==='disk') h.lowDisk();
      await assert.rejects(h.cache.preparePracticeRecording(practice), mode==='lease' ? /refresh/ : mode==='checksum' ? /checksum/ : /storage/);
      assert.equal((await h.cache.readContent()).days['2026-10-03'].sanskrit,practice.sanskrit);
      assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM playback_pins').get().n,0);
    } finally { h.dispose(); }
  }
});
test('matching cached metadata is used only for the same revision; newer recordings cannot replace it', async () => {
  const h=harness(); let recording;
  try {
    h.release(); await h.cache.syncContent(true); const practice=(await h.cache.readContent()).days['2026-10-03'];
    const withoutAsset={...practice,narration:{...practice.narration,asset:undefined}};
    recording=await h.cache.preparePracticeRecording(withoutAsset); assert.equal(recording.narration.assetId,practice.narration.assetId);
    await assert.rejects(h.cache.preparePracticeRecording({...withoutAsset,revision:'old-missing'}),/metadata/);
  } finally { await disposeRecording(h,recording); }
});
test('bundled recording preparation never needs a download or database lease', async () => {
  const h=harness();try {
    const practice={...h.practice('bundled'),narration:{audioSource:42,completionMs:5000,segments:[]}};
    h.offline(); const recording=await h.cache.preparePracticeRecording(practice);
    assert.equal(recording.narration.audioSource,42); recording.release(); recording.release(); assert.equal(h.downloads.length,0);
  } finally { h.dispose(); }
});

function addCycle(h, manifest, revision='cycle1', key='gita', length=7) {
  const cycle={key,revision,startDate:'2026-10-03',tracks:Array.from({length},(_,i)=>({title:`${revision} day ${i+1}`,asset:h.asset(`${revision}-${i}`)}))};
  manifest.alarmCycles=[...(manifest.alarmCycles??[]).filter(c=>c.key!==key),cycle];
  return cycle;
}
test('complete cycle installs once and remains through offline use, absent publications and clear downloads',async()=>{
  const h=harness();try{
    const m=h.release();addCycle(h,m);await h.cache.syncContent(true);
    assert.equal(h.nativeCycle().tracks.length,7);assert.equal(h.nativeCycle().revision,'cycle1');
    const installed=h.nativeCycle();await h.cache.syncContent(true);assert.equal(h.nativeCycle(),installed);
    m.alarmCycles=[];m.alarms=[];await h.cache.syncContent(true);
    assert.equal(h.nativeCycle().revision,'cycle1');assert.equal((await h.cache.readContent()).alarmCycles[0].revision,'cycle1');
    await h.cache.clearContentDownloads();h.offline();await h.cache.syncContent(true);
    assert.equal(h.nativeCycle().revision,'cycle1');
  }finally{h.dispose();}
});
test('incomplete, corrupt and failed native updates preserve the previous cycle and fallback',async()=>{
  for(const failure of ['missing','checksum','native','disk']) {
    const h=harness();try{
      const m=h.release();addCycle(h,m);await h.cache.syncContent(true);
      const installed=h.nativeCycle(), fallbackCount=h.installs.length;
      const replacement=addCycle(h,m,'cycle2');
      if(failure==='missing')h.payloads.delete(replacement.tracks[3].asset.url);
      if(failure==='checksum')h.payloads.set(replacement.tracks[3].asset.url,Buffer.from('corrupt'));
      if(failure==='native')h.failNative(true);
      if(failure==='disk')h.lowDisk();
      await h.cache.syncContent(true);
      assert.equal(h.nativeCycle(),installed);assert.equal(h.installs.length,fallbackCount);
      assert.ok((await h.cache.readContent()).error);
    }finally{h.dispose();}
  }
});
test('a successful replacement switches only after all verified tracks are downloaded; unrelated modes are not downloaded',async()=>{
  const h=harness();try{
    const m=h.release();addCycle(h,m,'old','gita',1);await h.cache.syncContent(true);
    addCycle(h,m,'other','shankh',14);addCycle(h,m,'new','gita',14);
    await h.cache.syncContent(true);
    assert.equal(h.nativeCycle().revision,'new');assert.equal(h.nativeCycle().tracks.length,14);
    assert.ok(!h.downloads.some(url=>url.includes('/other-')));
    h.select('shankh');await h.cache.syncContent(true);assert.equal(h.nativeCycle().key,'shankh');assert.equal(h.nativeCycle().revision,'other');
  }finally{h.dispose();}
});

test('staging a future cycle leaves the existing single track unchanged until its start date',async()=>{
  const h=harness();try{
    const m=h.release();await h.cache.syncContent(true);const fallbackCount=h.installs.length;
    const cycle=addCycle(h,m,'future');cycle.startDate='2026-10-10';
    m.alarms[0]={...m.alarms[0],revision:'new-fallback',asset:cycle.tracks[0].asset};
    await h.cache.syncContent(true);assert.equal(h.nativeCycle().revision,'future');assert.equal(h.installs.length,fallbackCount);
  }finally{h.dispose();}
});
test('refresh repairs damaged native cycle copies from verified cached downloads',async()=>{
  const h=harness();try{
    const m=h.release();addCycle(h,m);await h.cache.syncContent(true);const before=h.nativeCycle(), downloads=h.downloads.length;
    h.corruptNative();await h.cache.syncContent(true);assert.notEqual(h.nativeCycle(),before);assert.equal(h.nativeCycle().revision,'cycle1');assert.equal(h.downloads.length,downloads);
  }finally{h.dispose();}
});

function imageCycle(h, revision = 'images1') {
  return { revision, startDate: '2026-10-03', images: Array.from({ length: 7 }, (_, i) => {
    if (i === 1) return null;
    const { durationMs, ...asset } = h.asset(`${revision}-day${i}`);
    return { ...asset, mimeType: 'image/webp', width: 100, height: 160 };
  }) };
}
test('alarm images download every slot, repeat offline, and use default for empty or future days', async () => {
  const h = harness();
  try {
    const manifest = h.release(); manifest.alarmImageCycle = imageCycle(h);
    await h.cache.syncContent(true);
    assert.equal((await h.cache.readContent()).alarmImageCycle.revision, 'images1');
    assert.equal(h.downloads.length, 14);
    h.offline();
    const first = await h.cache.prepareAlarmImage('2026-10-03');
    const repeat = await h.cache.prepareAlarmImage('2026-10-10');
    assert.ok(first.uri.startsWith('file:')); assert.equal(first.uri, repeat.uri);
    assert.equal(await h.cache.prepareAlarmImage('2026-10-04'), null);
    assert.equal(await h.cache.prepareAlarmImage('2026-10-02'), null);
    first.release(); repeat.release();
  } finally { h.dispose(); }
});
test('failed image replacements keep installed cycle, retry, and protect the visible old file', async () => {
  const h = harness();
  try {
    let manifest = h.release(); manifest.alarmImageCycle = imageCycle(h);
    await h.cache.syncContent(true);
    const visible = await h.cache.prepareAlarmImage('2026-10-03');
    manifest = h.release(); manifest.alarmImageCycle = imageCycle(h, 'images2');
    const last = manifest.alarmImageCycle.images[6]; const payload = h.payloads.get(last.url); h.payloads.delete(last.url);
    await h.cache.syncContent(true);
    assert.equal((await h.cache.readContent()).alarmImageCycle.revision, 'images1');
    assert.ok(existsSync(fileURLToPath(visible.uri)));
    h.payloads.set(last.url, payload);
    // A normal refresh must retry an incomplete cycle even inside the throttle window.
    await h.cache.syncContent();
    assert.equal((await h.cache.readContent()).alarmImageCycle.revision, 'images2');
    assert.ok(existsSync(fileURLToPath(visible.uri)));
    visible.release(); await h.cache.syncContent(true);
    assert.equal(existsSync(fileURLToPath(visible.uri)), false);
  } finally { h.dispose(); }
});
test('missing metadata retains images; explicit empty cycle restores default; corruption falls back', async () => {
  const h = harness();
  try {
    let manifest = h.release(); manifest.alarmImageCycle = imageCycle(h);
    await h.cache.syncContent(true);
    const first = await h.cache.prepareAlarmImage('2026-10-03'); first.release();
    writeFileSync(fileURLToPath(first.uri), 'corrupt');
    assert.equal(await h.cache.prepareAlarmImage('2026-10-03'), null);
    await h.cache.syncContent(true);
    assert.ok(await h.cache.prepareAlarmImage('2026-10-03').then(v => { v?.release(); return v; }));
    manifest = h.release(); await h.cache.syncContent(true);
    assert.equal((await h.cache.readContent()).alarmImageCycle.revision, 'images1');
    manifest.alarmImageCycle = { revision: 'empty', startDate: '2026-10-03', images: Array(7).fill(null) };
    await h.cache.syncContent(true);
    assert.equal(await h.cache.prepareAlarmImage('2026-10-03'), null);
  } finally { h.dispose(); }
});
test('durable image selection survives snooze and replacement, then advances for the next alarm', async () => {
  const h = harness();
  try {
    let manifest = h.release(); manifest.alarmImageCycle = imageCycle(h);
    await h.cache.syncContent(true);
    const first = await h.cache.prepareAlarmImage('2026-10-03', 'original-alarm');
    first.release();
    manifest = h.release(); manifest.alarmImageCycle = imageCycle(h, 'images2');
    await h.cache.syncContent(true);
    const snoozed = await h.cache.prepareAlarmImage('2026-10-04', 'original-alarm');
    assert.equal(snoozed.uri, first.uri); snoozed.release();
    const next = await h.cache.prepareAlarmImage('2026-10-10', 'next-alarm');
    assert.notEqual(next.uri, first.uri); next.release();
  } finally { h.dispose(); }
});
