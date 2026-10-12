import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFcmMessage, fcmDisposition, retryDelay, createFcmProvider } from '../lib/firebase/functions/fcm-provider.js';
const now=Date.now();
const campaign={id:'c',title:'Default',body:'Message',translations:{hi:{title:'हिंदी',body:'संदेश'}},destination:'gita',sound:true,expiresAt:now+86400000};
const recipient={uid:'u',token:'native-fcm-token-123456789',language:'hi'};
test('FCM uses visible messages, the SDK JSON body, Android channels and bounded TTL',()=>{
 const m=buildFcmMessage(campaign,recipient,now);assert.equal(m.token,recipient.token);assert.equal(m.notification.title,'हिंदी');assert.equal(m.android.ttl,'86400s');assert.equal(m.android.notification.channel_id,'owner-announcements-v1');assert.equal(m.android.notification.sound,'default');assert.equal(m.android.restricted_package_name,'com.anonymous.geeta');
 assert.deepEqual(JSON.parse(m.data.body),{kind:'owner-announcement',version:1,campaignId:'c',deliveryId:'u',destination:'gita',sound:true});assert.ok(Object.values(m.data).every(v=>typeof v==='string'));
 const silent=buildFcmMessage({...campaign,sound:false},recipient,now);assert.equal(silent.android.notification.channel_id,'owner-announcements-silent-v1');assert.equal(silent.android.notification.default_sound,false);assert.equal(silent.android.notification.sound,undefined);assert.equal(JSON.parse(silent.data.body).sound,false);
 assert.equal(buildFcmMessage({...campaign,expiresAt:now-1},recipient,now).android.ttl,'0s');
 assert.throws(()=>buildFcmMessage({...campaign,body:'ह'.repeat(2000)}, {...recipient,language:'en'},now),/4096/);
});
test('FCM retry classification separates explicit rejections, terminal errors and ambiguous outcomes',()=>{
 for(const code of ['QUOTA_EXCEEDED','UNAVAILABLE','INTERNAL']) {assert.equal(fcmDisposition(code,1),'pending');assert.equal(fcmDisposition(code,5),'failed');}
 for(const code of ['UNREGISTERED','INVALID_ARGUMENT','SENDER_ID_MISMATCH','UNAUTHENTICATED','PERMISSION_DENIED']) assert.equal(fcmDisposition(code,1),'failed');
 assert.equal(fcmDisposition('notification/submission-unknown',1),'unknown');assert.equal(fcmDisposition('notification/unknown-response',1),'unknown');assert.equal(fcmDisposition('notification/expired',1),'cancelled');
 assert.equal(retryDelay(1,0,()=>0),60000);assert.equal(retryDelay(2,0,()=>0),120000);assert.equal(retryDelay(1,300000,()=>0),300000);
});

test('direct FCM transport uses Firebase credentials, preserves response order and never retries ambiguous requests',async()=>{
 const message=buildFcmMessage(campaign,recipient), calls=[];
 const provider=createFcmProvider(async()=>({projectId:'demo-geeta',accessToken:'fake-token'}),async(url,options)=>{
   calls.push({url,options});const body=JSON.parse(options.body);assert.equal(body.message.expiresAt,undefined);assert.equal(body.message.token,recipient.token);assert.ok(body.message.android.ttl.endsWith('s'));assert.equal(options.headers.Authorization,'Bearer fake-token');
   if(calls.length===1) return new Response(JSON.stringify({name:'projects/demo-geeta/messages/accepted'}),{status:200});
   if(calls.length===2) return new Response(JSON.stringify({error:{status:'RESOURCE_EXHAUSTED'}}),{status:429,headers:{'Retry-After':'120'}});
   throw new Error('socket reset after submission');
 });
 const results=await provider.send([message,message,message]);assert.equal(calls.length,3);assert.ok(calls.every(c=>c.url==='https://fcm.googleapis.com/v1/projects/demo-geeta/messages:send'));assert.equal(results[0].success,true);assert.deepEqual(results[1],{success:false,code:'QUOTA_EXCEEDED',retryAfterMs:120000});assert.deepEqual(results[2],{success:false,code:'notification/submission-unknown'});
 const expired=await provider.send([{...message,expiresAt:Date.now()-1}]);assert.equal(calls.length,3);assert.equal(expired[0].code,'notification/expired');
 const invalidAuth=createFcmProvider(async()=>{throw new Error('no credential');},async()=>assert.fail('No FCM request without credentials'));assert.equal((await invalidAuth.send([message]))[0].code,'notification/credentials-unavailable');
});
