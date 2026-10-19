import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {activateTrack,emptySnapshot,successor,traversal,transportAvailability,notificationPlayerAction,librarySnapshot} from '../src/services/music/model.ts';
const adapters=new Set();afterEach(()=>{for(const adapter of adapters)adapter.dispose();adapters.clear();});

const state={players:[],resolve:async t=>({uri:t.id}),mode:async()=>{}};globalThis.__musicTest=state;
const hook=registerHooks({resolve(specifier,context,next){let code;if(specifier==='expo-audio')code='export const createAudioPlayer=(...a)=>globalThis.__musicTest.create(...a)';if(specifier==='./ownership')code='export const musicAudioMode=(...a)=>globalThis.__musicTest.mode(...a)';if(specifier==='../music-downloads')code='export const resolveMusicSource=(...a)=>globalThis.__musicTest.resolve(...a);export const pinMusicFile=()=>()=>{}';if(code)return{url:`data:text/javascript,${encodeURIComponent(code)}`,shortCircuit:true};if(specifier==='./seek-controller')return next('./seek-controller.ts',context);if(specifier==='./model')return next('./model.ts',context);return next(specifier,context);}});
const {ExpoMusicAdapter}=await import('../src/services/music/expo-adapter.ts');hook.deregister();
state.create=()=>{const p={get currentTime(){return this.position;},playbackRate:1,plays:0,pauses:0,removed:false,position:0,listener:null,play(){this.plays++;},pause(){this.pauses++;},remove(){this.removed=true;},setActiveForLockScreen(){},async seekTo(s){this.position=s;},addListener(_,fn){this.listener=fn;return{remove:()=>{this.listener=null;}};},status(patch={}){if(patch.currentTime!==undefined)this.position=patch.currentTime;this.listener?.({currentTime:this.position,duration:60,isLoaded:true,playing:true,isBuffering:false,...patch});}};state.players.push(p);return p;};
const entries=()=>['A','B','A'].map((id,i)=>({entryId:`e${i}`,track:{id,availability:'available',durationMs:60000,audioSource:{uri:id}}}));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const flush=()=>new Promise(r=>setImmediate(r));
function harness(){state.players=[];state.resolve=async t=>({uri:t.id});state.mode=async()=>{};const adapter=new ExpoMusicAdapter();adapters.add(adapter);return adapter;}
test('repeat boundaries distinguish natural completion and explicit Next',()=>{const s={...emptySnapshot(),queue:entries(),order:['e0','e1','e2'],entryId:'e2'};assert.equal(successor(s),null);s.repeat='all';assert.equal(successor(s),'e0');s.repeat='one';assert.equal(successor(s,true),'e2');assert.equal(successor(s,false),null);s.timer='end-of-track';assert.equal(successor(s,true),null);});
test('shuffle preserves current entry first and disabling restores catalog order including duplicates',()=>{const q=entries();const order=traversal(q,'e1',true,()=>0);assert.equal(order[0],'e1');assert.equal(new Set(order).size,3);assert.deepEqual(traversal(q,'e1',false),['e0','e1','e2']);});
test('rapid A to B ignores stale source resolution',async()=>{const a=harness(),d=deferred(),q=entries();state.resolve=t=>t.id==='A'?d.promise:Promise.resolve({uri:'B'});const first=a.replaceQueue(q,'e0');await a.replaceQueue(q,'e1');d.resolve({uri:'A'});await first;assert.equal(a.getSnapshot().entryId,'e1');assert.equal(state.players.length,1);assert.equal(state.players[0].plays,1);a.dispose();});
test('pause during loading invalidates pending play and stale failures',async()=>{const a=harness(),d=deferred();state.resolve=()=>d.promise;const pending=a.replaceQueue(entries(),'e0');a.pause();d.resolve({uri:'A'});await pending;assert.equal(state.players.length,0);assert.equal(a.getSnapshot().state,'paused');a.dispose();});
test('failed source stays selected, reports error and supports Retry',async()=>{const a=harness();state.resolve=async()=>{throw Error('Offline');};await a.replaceQueue(entries(),'e1');assert.equal(a.getSnapshot().state,'failed');assert.equal(a.getSnapshot().entryId,'e1');assert.match(a.getSnapshot().error,/Offline/);state.resolve=async()=>({uri:'B'});await a.play();assert.equal(state.players.at(-1).plays,1);state.players.at(-1).status();assert.equal(a.getSnapshot().state,'playing');a.dispose();});
test('duplicate track entries advance independently and Previous follows history without wrapping',async()=>{const a=harness();await a.replaceQueue(entries(),'e0');state.players.at(-1).status();await a.previous();assert.equal(a.getSnapshot().entryId,'e0');await a.next();state.players.at(-1).status();await a.next();assert.equal(a.getSnapshot().entryId,'e2');await a.previous();assert.equal(a.getSnapshot().entryId,'e1');a.dispose();});
test('end-of-track timer wins over repeat and replay after completion restarts zero',async()=>{const a=harness();await a.replaceQueue(entries(),'e0');a.setRepeat('one');a.setTimer('end-of-track');state.players.at(-1).status({currentTime:60,didJustFinish:true});await flush();assert.equal(a.getSnapshot().state,'completed');assert.equal(a.getSnapshot().timer,null);await a.play();assert.equal(state.players.at(-1).position,0);a.dispose();});
test('minute timer expires while paused and blocks a pending source; ritual requires explicit resume',async()=>{const a=harness(),d=deferred();state.resolve=()=>d.promise;const pending=a.replaceQueue(entries(),'e0');a.setTimer(5);a.deadline=performance.now()-1;a.tick();d.resolve({uri:'A'});await pending;assert.equal(a.getSnapshot().timer,null);assert.equal(state.players.length,0);state.resolve=async()=>({uri:'A'});a.setOwner('ritual');await a.play();assert.equal(state.players.length,0);a.setOwner('none');assert.equal(state.players.length,0);await a.play();assert.equal(state.players.at(-1).plays,1);a.dispose();});
test('seeks clamp and unsupported speed values are ignored',async()=>{const a=harness();await a.replaceQueue(entries(),'e0');await a.seek(999999);assert.equal(state.players[0].position,60);await a.seek(-1);assert.equal(state.players[0].position,0);a.setSpeed(100);assert.equal(a.getSnapshot().speed,1);a.dispose();});
test('progress updates keep the library snapshot stable while full-player progress changes',async()=>{const a=harness();await a.replaceQueue(entries(),'e0');const player=state.players.at(-1);player.status();const library=a.getLibrarySnapshot(),progress=a.getSnapshot();player.status({currentTime:1});assert.equal(a.getLibrarySnapshot(),library);assert.notEqual(a.getSnapshot(),progress);assert.equal(a.getSnapshot().positionMs,1000);});
test('stale native status errors and completion cannot change a newer source',async()=>{const a=harness();await a.replaceQueue(entries(),'e0');const stale=state.players.at(-1).listener;await a.next();stale({currentTime:60,duration:60,playing:false,isLoaded:true,isBuffering:false,didJustFinish:true,error:'Old decoder'});await flush();assert.equal(a.getSnapshot().entryId,'e1');assert.equal(a.getSnapshot().error,null);});
test('catalog updates preserve active revision, update future entries and exclude unavailable transitions',async()=>{const a=harness(),q=entries().map(e=>({...e,track:{...e.track,revision:'r1'}}));await a.replaceQueue(q,'e0');state.players.at(-1).status();a.updateCatalog([{...q[0].track,revision:'r2'},{...q[1].track,availability:'comingSoon'}],true);assert.equal(a.getSnapshot().queue[0].track.revision,'r1');assert.equal(a.getSnapshot().queue[2].track.revision,'r2');await a.next();assert.equal(a.getSnapshot().entryId,'e2');assert.equal(a.getSnapshot().queue.find(e=>e.entryId==='e2').track.revision,'r2');});

test('activating a live track preserves queue, position and player; a paused track resumes', async()=>{
  const a=harness(),q=entries(); await a.replaceQueue(q,'e0'); const p=state.players.at(-1);p.status({currentTime:12});
  const liveQueue=a.getSnapshot().queue;let starts=0; await activateTrack(a,q[0].track,async()=>{starts++;});
  assert.equal(starts,0);assert.equal(state.players.at(-1),p);assert.equal(a.getSnapshot().positionMs,12000);assert.equal(a.getSnapshot().queue,liveQueue);
  a.pause();await activateTrack(a,q[0].track,async()=>{starts++;});assert.equal(starts,0);assert.equal(state.players.at(-1).position,12);
  await activateTrack(a,q[1].track,async()=>{starts++;});assert.equal(starts,1);
});
test('repeated activation during source loading does not create a second request',async()=>{
  const a=harness(),d=deferred(),q=entries();state.resolve=()=>d.promise;const pending=a.replaceQueue(q,'e0');
  await activateTrack(a,q[0].track,async()=>assert.fail('replaced pending queue'));d.resolve({uri:'A'});await pending;assert.equal(state.players.length,1);
});
test('selecting duplicate queue entries preserves identity, order, repeat, shuffle, and history',async()=>{
  const a=harness(),q=entries();await a.replaceQueue(q,'e0');state.players.at(-1).status();a.setShuffle(true);a.setRepeat('all');const order=a.getSnapshot().order,liveQueue=a.getSnapshot().queue;
  await a.selectEntry('e2');assert.equal(a.getSnapshot().entryId,'e2');assert.equal(a.getSnapshot().queue,liveQueue);assert.equal(a.getSnapshot().order,order);assert.equal(a.getSnapshot().repeat,'all');assert.equal(a.getSnapshot().shuffle,true);assert.deepEqual(a.getSnapshot().history,['e0']);
  const p=state.players.at(-1);p.status({currentTime:9});await a.selectEntry('e2');assert.equal(state.players.at(-1),p);assert.equal(a.getSnapshot().positionMs,9000);
});
test('stop clears session and timer and invalidates pending source resolution',async()=>{
  const a=harness(),d=deferred();state.resolve=()=>d.promise;const pending=a.replaceQueue(entries(),'e0');a.setTimer(5);a.stop();d.resolve({uri:'A'});await pending;
  assert.equal(a.getSnapshot().entryId,null);assert.deepEqual(a.getSnapshot().queue,[]);assert.equal(a.getSnapshot().timer,null);assert.equal(state.players.length,0);
});
test('buffering and interruption changes publish library snapshots',async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1);p.status();const before=a.getLibrarySnapshot();p.status({isBuffering:true,playing:false});
  assert.notEqual(a.getLibrarySnapshot(),before);assert.equal(a.getSnapshot().state,'playing');assert.equal(a.getSnapshot().buffering,true);
  const buffered=a.getLibrarySnapshot();a.pause('alarm');assert.notEqual(a.getLibrarySnapshot(),buffered);assert.equal(a.getLibrarySnapshot().interruption,'alarm');
});
test('transport availability uses queue entries and restart threshold',()=>{
  const s={...emptySnapshot(),queue:entries(),order:['e0','e1','e2'],entryId:'e0'};
  assert.deepEqual(transportAvailability(s),{canNext:true,canPrevious:false});s.positionMs=3001;assert.equal(transportAvailability(s).canPrevious,true);
  s.entryId='e2';s.positionMs=0;assert.equal(transportAvailability(s).canNext,false);s.repeat='all';assert.equal(transportAvailability(s).canNext,true);assert.equal(transportAvailability(s).canPrevious,true);
});
test('notification open waits for hydration and ignores missing or priority-owned sessions',()=>{
  assert.equal(notificationPlayerAction('1',false,false,false),'wait');assert.equal(notificationPlayerAction('1',true,true,false),'open');
  assert.equal(notificationPlayerAction('1',true,false,false),'ignore');assert.equal(notificationPlayerAction('1',true,true,true),'ignore');assert.equal(notificationPlayerAction(undefined,true,true,false),'ignore');
});

test('library transport updates when eligible order or history changes, while equal arrays stay stable',()=>{
  const s={...emptySnapshot(),queue:entries(),entryId:'e0',order:['e0','e1'],history:[]};
  assert.equal(librarySnapshot(s,{...s,order:[...s.order],history:[]}),s);
  const restricted={...s,order:['e0']};assert.equal(librarySnapshot(s,restricted),restricted);assert.equal(transportAvailability(restricted).canNext,false);
  const withHistory={...s,history:['e2']};assert.equal(librarySnapshot(s,withHistory),withHistory);assert.equal(transportAvailability(withHistory).canPrevious,true);
});

test('paused resume retains the loaded player and seeking does not autoplay', async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1);p.status({currentTime:12});
  a.pause();const plays=p.plays;await a.seek(24000);assert.equal(p.position,24);assert.equal(p.plays,plays);assert.equal(a.getSnapshot().state,'paused');
  await a.play();assert.equal(state.players.length,1);assert.equal(state.players[0],p);assert.equal(p.removed,false);assert.equal(p.plays,plays+1);
});
test('rapid seeks serialize and keep only the latest queued target', async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1),d=deferred(),calls=[];
  p.seekTo=async seconds=>{calls.push(seconds);if(calls.length===1)await d.promise;p.position=seconds;};
  const first=a.seek(10000),middle=a.seek(20000),last=a.seek(35000);
  assert.equal(a.getSnapshot().positionMs,35000);assert.equal(a.getSnapshot().seeking,true);
  d.resolve();await Promise.all([first,middle,last]);assert.deepEqual(calls,[35]);assert.equal(p.position,35);assert.equal(a.getSnapshot().seeking,false);
});
test('stale progress during a seek cannot move the slider back', async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1),d=deferred();
  p.seekTo=async seconds=>{await d.promise;p.position=seconds;};const seek=a.seek(30000);await flush();
  p.status({currentTime:0,playing:false,isBuffering:true});assert.equal(a.getSnapshot().positionMs,30000);assert.equal(a.getSnapshot().seeking,true);
  d.resolve();await seek;assert.equal(a.getSnapshot().positionMs,30000);assert.equal(a.getSnapshot().seeking,false);
});
test('seek failure preserves requested position for retry', async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1);p.seekTo=async()=>{throw Error('Network lost');};
  await assert.rejects(a.seek(27000),/Network lost/);assert.equal(a.getSnapshot().positionMs,27000);assert.equal(a.getSnapshot().state,'failed');
  await a.play();assert.equal(state.players.at(-1).position,27);assert.equal(a.getSnapshot().queue.length,3);
});
test('pause during retry source resolution never resumes automatically', async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');state.players.at(-1).status({currentTime:12,error:'Disconnected'});
  const d=deferred();state.resolve=()=>d.promise;const retry=a.play();a.pause();d.resolve({uri:'A'});await retry;
  assert.equal(a.getSnapshot().state,'paused');assert.equal(state.players.at(-1).plays,1);
});
test('retry source failure and native zero error status preserve last confirmed position',async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1);p.status({currentTime:19});p.status({currentTime:0,error:'Connection lost'});
  assert.equal(a.getSnapshot().positionMs,19000);state.resolve=async()=>{throw Error('Still offline');};await a.play();assert.equal(a.getSnapshot().positionMs,19000);assert.equal(a.getSnapshot().state,'failed');
});
test('stall recovery preserves position and remains paused after interruption',async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1);p.status({currentTime:8,isBuffering:true});
  a.lastProgressAt=performance.now()-16000;a.tick();assert.equal(a.getSnapshot().state,'failed');assert.equal(a.getSnapshot().positionMs,8000);
  a.pause('alarm');a.lastProgressAt=performance.now()-16000;a.tick();assert.equal(a.getSnapshot().state,'paused');
});
test('a dispatched seek followed by more requests applies the latest target last',async()=>{
  const a=harness();await a.replaceQueue(entries(),'e0');const p=state.players.at(-1),d=deferred(),calls=[];
  p.seekTo=async seconds=>{calls.push(seconds);if(calls.length===1)await d.promise;p.position=seconds;};
  const first=a.seek(10000);await flush();assert.deepEqual(calls,[10]);
  const middle=a.seek(20000),last=a.seek(35000);await new Promise(r=>setTimeout(r,40));assert.deepEqual(calls,[10]);d.resolve();await Promise.all([first,middle,last]);
  assert.deepEqual(calls,[10,35]);assert.equal(a.getSnapshot().positionMs,35000);
});
test('completed background acquisition switches to local audio on the next seek without replacing the queue',async()=>{
  const a=harness();state.resolve=async()=>({uri:'https://example.test/song.mp3'});await a.replaceQueue(entries(),'e0');
  const p=state.players.at(-1),queue=a.getSnapshot().queue,calls=[];p.replace=source=>{calls.push(source.uri);p.position=0;};p.status({currentTime:12});
  state.resolve=async()=>({uri:'file:///verified-song.audio'});await a.seek(26000);
  assert.deepEqual(calls,['file:///verified-song.audio']);assert.equal(p.position,26);assert.equal(a.getSnapshot().queue,queue);assert.equal(state.players.length,1);
});
test('a paused local handover never resumes playback',async()=>{
  const a=harness();state.resolve=async()=>({uri:'https://example.test/song.mp3'});await a.replaceQueue(entries(),'e0');
  const p=state.players.at(-1);p.replace=()=>{p.position=0;};p.status({currentTime:9});a.pause();const plays=p.plays;
  state.resolve=async()=>({uri:'file:///verified-song.audio'});await a.seek(18000);assert.equal(p.position,18);assert.equal(p.plays,plays);assert.equal(a.getSnapshot().state,'paused');
});
