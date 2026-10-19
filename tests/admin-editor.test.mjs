import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react');
function harness(){
 const states=[],posts=[],drafts=[];let cursor=0,component;
 const asset={id:'verified',url:'https://storage.googleapis.com/demo/drafts/editor/file.mp3',mimeType:'audio/mpeg',bytes:1000,sha256:'a'.repeat(64),durationMs:54768};
 const hooks={...React,useEffect:()=>{},useRef:v=>hooks.useState(()=>({current:v}))[0],useState:init=>{const i=cursor++;if(!(i in states))states[i]=typeof init==='function'?init():init;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}};
 const db={};
 const mocks={react:hooks,'react-dom/client':{createRoot:()=>({render:e=>{component=e.type;}})},'firebase/app':{initializeApp:()=>({})},'firebase/auth':{getAuth:()=>({})},'firebase/firestore':{getFirestore:()=>db,doc:(_db,path)=>path,getDoc:async()=>({data:()=>undefined}),getDocs:async()=>({docs:[]}),setDoc:async(path,value)=>drafts.push({path,value})},'firebase/storage':{getStorage:()=>({}),ref:(_s,path)=>path,uploadBytesResumable:()=>({on:(_name,progress,_reject,resolve)=>{progress({bytesTransferred:1000,totalBytes:1000});resolve();}})},'../../shared/content':require('../shared/content.ts'),'./style.css':{}};
 const helper={};runInNewContext(ts.transpileModule(readFileSync(new URL('../admin/src/practice-import.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:helper,require:n=>mocks[n]});mocks['./practice-import']=helper;
 const compiled=ts.transpileModule(readFileSync(new URL('../admin/src/main.tsx',import.meta.url),'utf8').replace('import.meta.env','({VITE_FIREBASE_PROJECT_ID:"demo"})'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const LocalURL=class extends URL{static createObjectURL(){return 'blob:preview';}static revokeObjectURL(){}};
 runInNewContext(compiled,{exports:{},require:n=>mocks[n],crypto:{randomUUID},document:{getElementById:()=>({})},URL:LocalURL,confirm:()=>true,fetch:async(path,options)=>{const body=JSON.parse(options.body);posts.push({path,body});return {ok:true,json:async()=>path.endsWith('validate-asset')?asset:{releaseId:'new'} };}});
 const render=()=>{cursor=0;return component();};render();states[1]={uid:'editor',getIdToken:async()=> 'valid'};states[2]=true;
 function all(element,predicate){if(!element || typeof element!=='object')return [];const children=element.props?.children;return [...(predicate(element)?[element]:[]),...[children].flat(Infinity).flatMap(e=>all(e,predicate))];}
 const button=(tree,label)=>all(tree,e=>e.type==='button' && e.props.children===label)[0];
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
 return {render,all,button,posts,drafts,flush};
}
test('pasted content survives upload, switching dates and saving an incomplete draft',async()=>{
 const h=harness();let tree=h.render();h.all(tree,e=>e.type==='textarea')[0].props.onChange({target:{value:'{"unfinished":true}'}});
 tree=h.render();const upload=h.all(tree,e=>e.type==='input' && e.props.type==='file' && e.props.accept==='.mp3,.m4a')[0];upload.props.onChange({target:{files:[{name:'recording.mp3',size:1000}],value:'recording.mp3'}});await h.flush();tree=h.render();assert.equal(h.all(tree,e=>e.type==='textarea')[0].props.value,'{"unfinished":true}');
 const nav=h.all(tree,e=>e.type==='nav' && e.props['aria-label']==='Publication dates')[0];nav.props.children[1].props.onClick();tree=h.render();h.all(tree,e=>e.type==='nav' && e.props['aria-label']==='Publication dates')[0].props.children[0].props.onClick();tree=h.render();assert.equal(h.all(tree,e=>e.type==='textarea')[0].props.value,'{"unfinished":true}');
 h.button(tree,'Save draft').props.onClick();await h.flush();assert.equal(h.drafts[0].value.buffers[0],'{"unfinished":true}');assert.equal(h.drafts[0].value.assets[0].id,'verified');
});
test('review and publication automatically combine supplied JSON with verified audio for the selected date',async()=>{
 const h=harness();const text=readFileSync(new URL('../admin/examples/gita-10-21.json',import.meta.url),'utf8');let tree=h.render();
 h.all(tree,e=>e.type==='textarea')[0].props.onChange({target:{value:text}});tree=h.render();
 let publish=h.all(tree,e=>e.type==='button' && Array.isArray(e.props.children) && e.props.children[0]==='Publish teaching for ')[0];assert.equal(publish.props.disabled,true);
 const upload=h.all(tree,e=>e.type==='input' && e.props.type==='file' && e.props.accept==='.mp3,.m4a')[0];upload.props.onChange({target:{files:[{name:'matching.mp3',size:1000}],value:'matching.mp3'}});await h.flush();tree=h.render();
 publish=h.all(tree,e=>e.type==='button' && Array.isArray(e.props.children) && e.props.children[0]==='Publish teaching for ')[0];assert.equal(publish.props.disabled,false);publish.props.onClick();await h.flush();
 const post=h.posts.find(p=>p.path.endsWith('publish-day'));assert.ok(post);assert.equal(post.body.practice.id,'10-21');assert.equal(post.body.practice.narration.asset.id,'verified');assert.equal(post.body.practice.narration.completionMs,54730);assert.equal(post.body.practice.narration.segments[6].kind,'intro');assert.equal(post.body.expectedReleaseId,null);
 assert.equal(h.all(h.render(),e=>e.type==='textarea')[0].props.value,text);
});
