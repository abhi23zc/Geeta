import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import { migrateMusicRelease } from '../lib/shared/music-presentation.js';
const base='http://127.0.0.1:5001/demo-geeta/asia-south1/musicApi/api/music';
test('music admin authorization, exact asset validation, publication conflict, ETag and audited restore',async t=>{
 for(const key of ['FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'])assert.ok(process.env[key],'Emulators required; production access forbidden');
 const app=initializeApp({projectId:'demo-geeta',storageBucket:'demo-geeta.appspot.com'},`music-${randomUUID()}`),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
 const email=`music-${randomUUID()}@example.test`,password='Test-password-123';const user=await auth.createUser({email,password});await auth.setCustomUserClaims(user.uid,{admin:true});
 const login=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const{idToken}=await login.json();assert.ok(idToken);
 const post=async(path,body,token=idToken)=>{const r=await fetch(`${base}/admin/${path}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};};
 try{
 await t.test('every mutation rejects an unauthenticated caller',async()=>{for(const path of ['draft','validate-asset','publish','restore','load'])assert.equal((await post(path,{},'invalid')).status,403);});
 const audio=await readFile('../../assets/audio/gita/geeta-10-20-hi.mp3'),path=`music/uploads/${user.uid}/${randomUUID()}.mp3`;
 await storage.bucket().file(path).save(audio,{metadata:{contentType:'audio/mpeg'}});
 let asset;
 await t.test('validation enforces owner and actual format; exact audio measurements are returned',async()=>{assert.equal((await post('validate-asset',{path:path.replace(user.uid,'other')})).status,400);const bad=`music/uploads/${user.uid}/${randomUUID()}.mp3`;await storage.bucket().file(bad).save(Buffer.from('not audio'),{metadata:{contentType:'audio/mpeg'}});assert.equal((await post('validate-asset',{path:bad})).status,400);const verified=await post('validate-asset',{path});assert.equal(verified.status,200,JSON.stringify(verified.body));asset=verified.body;assert.equal(asset.bytes,audio.length);assert.equal(asset.durationMs,58968);assert.equal(asset.sha256,createHash('sha256').update(audio).digest('hex'));});
 const current=(await post('load',{})).body.releaseId;
 const legacyCatalog={schemaVersion:1,releaseId:'draft',publishedAt:new Date(0).toISOString(),enabled:true,tracks:[{id:'music-test',revision:'r1',availability:'available',category:'gita',metadata:{en:{title:'Recording'}},unavailableTranslations:['hi'],tags:[],asset,credits:'Test recording owner',rightsConfirmed:true}],playlists:[{id:'music-test',metadata:{en:{title:'Test playlist'}},trackIds:['music-test','music-test']}]};
 const catalog=migrateMusicRelease(legacyCatalog);
 await t.test('server drafts and lyric validation',async()=>{assert.equal((await post('draft',{catalog,editorVersion:2})).status,200);assert.equal((await post('load',{})).body.draft.tracks[0].id,'music-test');const invalid=structuredClone(catalog);invalid.tracks[0].lyrics=[{startMs:0,endMs:asset.durationMs+1}];assert.equal((await post('publish',{catalog:invalid,expectedReleaseId:current})).status,400);});
 let release;
 await t.test('publishing uses validated bytes after upload mutation and rejects stale releases',async()=>{await storage.bucket().file(path).save(Buffer.from('changed upload'),{metadata:{contentType:'audio/mpeg'}});const result=await post('publish',{catalog,expectedReleaseId:current});assert.equal(result.status,200,JSON.stringify(result.body));release=result.body.releaseId;assert.notEqual(release,current);const[published]=await storage.bucket().file(`music/published/${asset.id}.audio`).download();assert.equal(createHash('sha256').update(published).digest('hex'),asset.sha256);assert.equal((await post('publish',{catalog,expectedReleaseId:current})).status,409);});
 await t.test('public catalog ETag and explicit disable are authoritative',async()=>{const response=await fetch(`${base}/catalog`);const body=await response.json();assert.equal(body.releaseId,release);assert.equal((await fetch(`${base}/catalog`,{headers:{'If-None-Match':response.headers.get('ETag')}})).status,304);const result=await post('publish',{catalog:{...catalog,enabled:false},expectedReleaseId:release});assert.equal(result.status,200);const disabled=await(await fetch(`${base}/catalog`)).json();assert.equal(disabled.enabled,false);release=result.body.releaseId;});
 await t.test('restore creates a new release with actor and source audit',async()=>{const result=await post('restore',{restoreId:release,expectedReleaseId:release});assert.equal(result.status,200);assert.notEqual(result.body.releaseId,release);const record=(await db.doc(`musicReleases/${result.body.releaseId}`).get()).data();assert.equal(record.actor,user.uid);assert.equal(record.restoredFrom,release);});
 }finally{await auth.deleteUser(user.uid);await deleteApp(app);}
});
