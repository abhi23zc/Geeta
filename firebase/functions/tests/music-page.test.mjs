import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { migrateMusicRelease } from '../lib/shared/music-presentation.js';
const base='http://127.0.0.1:5001/demo-geeta/asia-south1/musicApi/api/music';
test('visual music publication, image security, compatibility and restore', async t => {
 for(const key of ['FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'])assert.ok(process.env[key],'Emulators required; production access forbidden');
 const app=initializeApp({projectId:'demo-geeta',storageBucket:'demo-geeta.appspot.com'},`page-${randomUUID()}`),auth=getAuth(app),db=getFirestore(app),bucket=getStorage(app).bucket();
 const email=`page-${randomUUID()}@example.test`,password='Test-password-123',user=await auth.createUser({email,password});await auth.setCustomUserClaims(user.uid,{admin:true});
 const login=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})}),{idToken}=await login.json();
 const post=async(path,body,token=idToken)=>{const r=await fetch(`${base}/admin/${path}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};};
 try {
  await t.test('image and historical preview APIs require admin authorization',async()=>{for(const endpoint of ['validate-image','recrop-image','preview-release'])assert.equal((await post(endpoint,{},'invalid')).status,403);});
  const page=migrateMusicRelease({schemaVersion:1,releaseId:'draft',publishedAt:new Date(0).toISOString(),enabled:true,tracks:[{id:'page-gita',revision:'bundled-v1',category:'gita',availability:'available',bundledId:'gita-10-20-hi',metadata:{en:{title:'Gita'}},unavailableTranslations:['hi'],tags:[]}],playlists:[]});
  let image;
  await t.test('images validate owner and decoded format and produce immutable derivatives',async()=>{
   const path=`music/image-uploads/${user.uid}/${randomUUID()}.png`,buffer=await sharp({create:{width:80,height:50,channels:3,background:'#e56b27'}}).png().toBuffer();await bucket.file(path).save(buffer,{metadata:{contentType:'image/png'}});
   assert.equal((await post('validate-image',{path:path.replace(user.uid,'other'),name:'Artwork'})).status,400);
   const bad=`music/image-uploads/${user.uid}/${randomUUID()}.png`;await bucket.file(bad).save(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'),{metadata:{contentType:'image/png'}});assert.equal((await post('validate-image',{path:bad,name:'Unsafe'})).status,400);
   const result=await post('validate-image',{path,name:'Temple artwork',crop:{x:20,y:70}});assert.equal(result.status,200,JSON.stringify(result.body));image=result.body;assert.equal(image.width,80);const cropped=await post('recrop-image',{imageId:image.id,crop:{x:100,y:0}});assert.equal(cropped.status,200);assert.notEqual(cropped.body.id,image.id);for(const variant of ['thumbnail','square','banner','original']){const[bytes]=await bucket.file(`music/images/${image.id}/${variant}.webp`).download();assert.equal((await sharp(bytes).metadata()).format,'webp');}
  });
  page.media=[image];page.presentation.home.imageId=image.id;page.categories.push({...page.categories[0],id:'evening',name:{en:'Evening Calm'},theme:'flute'});page.tracks[0].category='evening';page.presentation.header.title.en='Our sacred sounds';
  const current=(await post('load',{})).body.releaseId;let release;
  await t.test('publication validates artwork provenance and atomically updates v1/v2 catalogs',async()=>{
   const invalid=structuredClone(page);invalid.media[0].square='https://example.test/unverified.webp';assert.equal((await post('publish',{catalog:invalid,expectedReleaseId:current})).status,400);
   const result=await post('publish',{catalog:page,expectedReleaseId:current});assert.equal(result.status,200,JSON.stringify(result.body));release=result.body.releaseId;
   const v2=await(await fetch(`${base}/catalog-v2`)).json(),v1=await(await fetch(`${base}/catalog`)).json();assert.equal(v2.releaseId,v1.releaseId);assert.equal(v2.tracks[0].category,'evening');assert.equal(v1.tracks[0].category,'flute');assert.equal(v2.presentation.header.title.en,'Our sacred sounds');
   const tagResponse=await fetch(`${base}/catalog-v2`);assert.equal((await fetch(`${base}/catalog-v2`,{headers:{'If-None-Match':tagResponse.headers.get('ETag')}})).status,304);
   assert.equal((await post('publish',{catalog:page,expectedReleaseId:current})).status,409);
  });
  await t.test('old editors are rejected and incomplete new drafts remain editable',async()=>{
   const incomplete=structuredClone(page);incomplete.presentation.header.title.en='';assert.equal((await post('draft',{catalog:incomplete,editorVersion:2})).status,200);assert.equal((await post('publish',{catalog:incomplete,expectedReleaseId:release})).status,400);
   assert.equal((await post('draft',{catalog:{schemaVersion:1}})).status,409);assert.equal((await post('publish',{catalog:{schemaVersion:1},expectedReleaseId:release})).status,409);
  });
  await t.test('historical preview and reviewed restore retain an audit trail',async()=>{
   assert.equal((await post('preview-release',{releaseId:release})).body.presentation.header.title.en,'Our sacred sounds');const restored=await post('publish',{catalog:page,expectedReleaseId:release,restoredFrom:release});assert.equal(restored.status,200);const record=(await db.doc(`musicPageReleases/${restored.body.releaseId}`).get()).data();assert.equal(record.restoredFrom,release);assert.equal(record.actor,user.uid);
  });
 } finally {await auth.deleteUser(user.uid);await deleteApp(app);}
});
