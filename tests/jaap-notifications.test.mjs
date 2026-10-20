import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { translate } from '../src/i18n/translations.ts';
function service(platform='android',granted=true){
 const scheduled=[],cancelled=[],storage=new Map([['geeta:notification-cleanup-v1','done'],['geeta:notification-ids-v1','["previous"]']]);let requested=0;
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[2026,9,20,12,0]));}static now(){return new FixedDate().getTime();}}
 const notifications={AndroidImportance:{DEFAULT:3,HIGH:4,LOW:2},AndroidNotificationPriority:{HIGH:'high'},AndroidNotificationVisibility:{PRIVATE:0},SchedulableTriggerInputTypes:{DATE:'date'},getPermissionsAsync:async()=>({granted}),requestPermissionsAsync:async()=>{requested++;return {granted:false};},setNotificationChannelAsync:async()=>{},cancelScheduledNotificationAsync:async id=>cancelled.push(id),scheduleNotificationAsync:async entry=>{scheduled.push(entry);return `n${scheduled.length}`;}};
 const output=ts.transpileModule(readFileSync(new URL('../src/services/engagement-notifications.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(output,{exports,Date:FixedDate,require:n=>({'expo-notifications':notifications,'react-native':{Platform:{OS:platform}},'@/i18n/translations':{translate},'@react-native-async-storage/async-storage':{getItem:async key=>storage.get(key)??null,setItem:async(k,v)=>storage.set(k,v)}}[n]??{})});
 return {api:exports,scheduled,cancelled,requested:()=>requested};
}
const base={practiceCompleted:false,quizCompleted:false,hasSavedTeaching:false,tasks:[],alarmEnabled:false,alarmTime:'06:30',jaap:{enabled:true,minutes:19*60,completed:false,language:'hi'}};
test('jaap reminders are local, localized, and suppressed after today’s target',async()=>{
 const a=service();await a.api.syncEngagementNotifications(base);const jaap=a.scheduled.filter(e=>e.content.data.kind==='jaap-reminder');assert.equal(jaap.length,31);assert.equal(jaap[0].content.title,'आपके जप का एक पल');assert.equal(jaap[0].content.data.url,'/jaap');assert.equal(a.cancelled[0],'previous');
 const b=service();await b.api.syncEngagementNotifications({...base,jaap:{...base.jaap,completed:true}});assert.equal(b.scheduled.filter(e=>e.content.data.kind==='jaap-reminder').length,30);
});
test('disabled reminders cancel the old schedule without adding jaap requests',async()=>{
 const s=service();await s.api.syncEngagementNotifications({...base,jaap:{...base.jaap,enabled:false}});assert.ok(s.cancelled.includes('previous'));assert.equal(s.scheduled.some(e=>e.content.data.kind==='jaap-reminder'),false);
});
test('jaap respects morning-alarm quiet windows and iOS keeps nearest requests within budget',async()=>{
 const s=service();await s.api.syncEngagementNotifications({...base,alarmEnabled:true,alarmTime:'19:00'});assert.equal(s.scheduled.some(e=>e.content.data.kind==='jaap-reminder'),false);
 const ios=service('ios');await ios.api.syncEngagementNotifications(base);assert.equal(ios.scheduled.length,60);assert.ok(ios.scheduled.every((e,i,all)=>i===0||e.trigger.date>=all[i-1].trigger.date));assert.ok(ios.scheduled.some(e=>e.content.data.kind==='jaap-reminder'));
});
test('permission denial is explicit and background scheduling never prompts',async()=>{
 const s=service('android',false);await s.api.syncEngagementNotifications(base);assert.equal(s.scheduled.length,0);assert.equal(s.requested(),0);assert.equal(await s.api.requestEngagementNotificationPermission(),false);assert.equal(s.requested(),1);
});
