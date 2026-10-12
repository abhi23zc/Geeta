import test from 'node:test';
import { queueOwnerOpening, deferOwnerNavigation } from '../src/services/owner-opening.ts';
import assert from 'node:assert/strict';
import { parseCampaign, parseRegistration, parseOwnerPayload, parseAudience, exclusion, messageFor, localDay, scheduledUtc } from '../shared/notifications.ts';
const now=Date.parse('2026-10-10T20:00:00Z');
const i={uid:'u',code:'G-0123456789ABCDEF',tokenProvider:'fcm',token:'fcm-test-token-abcdefghijklmnop',enabled:true,permission:true,language:'hi',timezone:'Asia/Kolkata',appVersion:'1',engagement:{practiceDate:'2026-10-10',quizDate:null,streak:3,hasSaved:true},tokenValid:true,lastActivity:now-3*86400000,summaryAt:now,createdAt:now};
const c={title:'Default',body:'Message',translations:{hi:{title:'हिंदी',body:'संदेश'}},destination:'gita',sound:true,expirationHours:24,audience:{},sendAt:now,timezone:'Asia/Kolkata'};
test('AND audiences, language, inactivity boundaries, codes, streak and saved state',()=>{
 assert.equal(exclusion(i,{language:'hi',inactiveDays:3,streakMin:3,streakMax:3,hasSaved:true,codes:[i.code]},now),null);
 for(const a of [{language:'en'},{inactiveDays:4},{streakMin:4},{streakMax:2},{hasSaved:false},{codes:['G-FFFFFFFFFFFFFFFF']}]) assert.ok(exclusion(i,a,now));
 for(const change of [{enabled:false},{permission:false},{token:null},{tokenValid:false},{tokenProvider:undefined}]) assert.ok(exclusion({...i,...change},{},now));
});
test('recipient timezone determines today across midnight; unknown summaries excluded',()=>{
 assert.equal(localDay(now,'Asia/Kolkata'),'2026-10-11');assert.equal(localDay(now,'America/New_York'),'2026-10-10');
 assert.equal(exclusion(i,{practiceIncomplete:true,quizIncomplete:true},now),null);
 assert.equal(exclusion({...i,timezone:'America/New_York'},{practiceIncomplete:true},now),'Practice completed today');
 for(const a of [{practiceIncomplete:true},{quizIncomplete:true},{streakMin:0},{streakMax:10},{hasSaved:false}]) assert.equal(exclusion({...i,engagement:null},a,now),'Unknown engagement summary');
 assert.equal(exclusion({...i,engagement:null},{language:'hi'},now),null);
});
test('strict payload validation and translation fallback',()=>{
 assert.deepEqual(messageFor(parseCampaign(c),'hinglish'),{title:'Default',body:'Message'});assert.equal(messageFor(c,'hi').title,'हिंदी');
 for(const p of [{destination:'https://evil.test'},{destination:'alarm'},{destination:'__proto__'},{sound:'yes'},{expirationHours:73},{title:'x'.repeat(121)},{translations:{hi:{title:'partial'}}},{timezone:'Invalid/Zone'}]) assert.throws(()=>parseCampaign({...c,...p}));
 assert.throws(()=>parseAudience({streakMin:4,streakMax:2}));assert.throws(()=>parseAudience({codes:['../escape']}));
 assert.equal(parseRegistration(i).token,i.token);assert.throws(()=>parseRegistration({...i,token:'bad'}));assert.throws(()=>parseRegistration({...i,token:'ExpoPushToken[abc]'}));assert.throws(()=>parseRegistration({...i,tokenProvider:undefined}));assert.throws(()=>parseRegistration({...i,engagement:{...i.engagement,practiceDate:'2026-02-30'}}));
});
test('only versioned owner payloads with safe IDs and destinations navigate',()=>{
 const p={kind:'owner-announcement',version:1,campaignId:'campaign',deliveryId:'user',destination:'gita'};
 assert.deepEqual(parseOwnerPayload(p),p);
 for(const x of [{version:2},{destination:'/alarm/wake'},{destination:'constructor'},{campaignId:'../escape'},{deliveryId:null},{kind:'something'}]) assert.equal(parseOwnerPayload({...p,...x}),null);
});
test('explicit timezone scheduling converts India correctly and rejects DST gaps/ambiguities',()=>{
 assert.equal(new Date(scheduledUtc('2026-10-11T08:00','Asia/Kolkata')).toISOString(),'2026-10-11T02:30:00.000Z');
 assert.throws(()=>scheduledUtc('2026-03-08T02:30','America/New_York'));assert.throws(()=>scheduledUtc('2026-11-01T01:30','America/New_York'));assert.throws(()=>scheduledUtc('2026-02-30T08:00','Asia/Kolkata'));
});

test('opening outbox persists deduplication and waits through onboarding and the complete alarm ritual',()=>{
 const p={kind:'owner-announcement',version:1,campaignId:'c',deliveryId:'u',destination:'quiz'};
 const queued=queueOwnerOpening({handled:[],opens:[],destination:null},p);
 const reloaded=JSON.parse(JSON.stringify(queued));assert.equal(queueOwnerOpening(reloaded,p),reloaded);assert.equal(reloaded.opens.length,1);
 assert.equal(deferOwnerNavigation(false,false,true),true);assert.equal(deferOwnerNavigation(true,true,true),true);assert.equal(deferOwnerNavigation(true,false,false),true);assert.equal(deferOwnerNavigation(true,false,true),false);
 assert.equal(queueOwnerOpening(reloaded,{...p,campaignId:'another',destination:'today'}).destination,'today');
});

test('FCM payloads unpack SDK JSON data and normalize string version fields',()=>{
 const p={kind:'owner-announcement',version:1,campaignId:'campaign',deliveryId:'user',destination:'gita',sound:false};
 assert.deepEqual(parseOwnerPayload({body:JSON.stringify(p)}),p);
 assert.deepEqual(parseOwnerPayload({...p,version:'1'}),p);
 assert.equal(parseOwnerPayload({body:'{broken json'}),null);
 assert.equal(parseOwnerPayload({body:JSON.stringify({...p,destination:'alarm'})}),null);
});
