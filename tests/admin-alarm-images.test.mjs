import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react');
function harness(){
  const state=[],saved=new Map(),posts=[];let cursor=0,allowConfirm=true;
  const hooks={...React,useEffect:()=>{},useRef:v=>hooks.useState(()=>({current:v}))[0],useState:init=>{const i=cursor++;if(!(i in state))state[i]=typeof init==='function'?init():init;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];}};
  const asset={id:'image',url:'https://storage.googleapis.com/demo/test.webp',mimeType:'image/webp',bytes:1000,sha256:'a'.repeat(64),width:100,height:100};
  const mocks={react:hooks,'firebase/firestore':{doc:(_db,path)=>path,setDoc:async(path,value)=>saved.set(path,structuredClone(value)),getDoc:async path=>({data:()=>saved.get(path)})},'firebase/storage':{ref:(_s,path)=>path,uploadBytesResumable:()=>({on:(_e,progress,_reject,resolve)=>{progress({bytesTransferred:1000,totalBytes:1000});resolve();}})},'../../shared/content':require('../shared/content.ts'),'./practice-import':{checkAudioFile:()=>{}}};
  const exports={};
  const source=ts.transpileModule(readFileSync(new URL('../admin/src/alarm-images.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const LocalURL=class extends URL{static createObjectURL(){return'blob:audio';}static revokeObjectURL(){}};
  runInNewContext(source,{exports,require:n=>mocks[n],Date,crypto:{randomUUID},URL:LocalURL,confirm:()=>allowConfirm});
  const props={user:{uid:'editor'},db:{},storage:{},release:'current',cycles:[],api:async(path,body)=>{posts.push({path,body});return path==='validate-alarm-image'?asset:{};},reload:async()=>{}};
  const render=()=>{cursor=0;return exports.AlarmImagesEditor(props);};
  function all(e,p){if(!e||typeof e!=='object')return[];return[...(p(e)?[e]:[]),...[e.props?.children].flat(Infinity).flatMap(c=>all(c,p))];}
  const button=label=>all(render(),e=>e.type==='button'&&e.props.children===label)[0];
  const selects=()=>all(render(),e=>e.type==='select');
  const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
  const upload=async i=>{all(render(),e=>e.type==='input'&&e.props.type==='file')[i].props.onChange({target:{files:[{name:`Day-${i+1}.png`,type:'image/png',size:1000}],value:'file'}});await flush();};
  return{render,all,button,selects,flush,upload,posts,saved,decline:()=>{allowConfirm=false;}};
}

test('image editor supports seven nullable slots, drafts, clearing, and independent publication', async () => {
  const h = harness();
  assert.equal(h.all(h.render(), e => e.type === 'input' && e.props.type === 'file').length, 7);
  await h.upload(0);
  h.button('Save draft').props.onClick(); await h.flush();
  assert.equal(h.saved.get('drafts/editor-alarm-images').cycle.images[0].id, 'image');
  assert.equal(h.saved.get('drafts/editor-alarm-images').cycle.images[1], null);
  const clear = h.all(h.render(), e => e.type === 'button' && Array.isArray(e.props.children) && e.props.children[0] === 'Clear day ')[0];
  clear.props.onClick();
  h.button('Load draft').props.onClick(); await h.flush();
  h.button('Publish seven-day cycle').props.onClick(); await h.flush();
  const post = h.posts.find(p => p.path === 'publish-alarm-images');
  assert.equal(post.body.cycle.images.length, 7); assert.equal(post.body.cycle.images[0].id, 'image');
  assert.equal(post.body.cycle.images[1], null); assert.equal(post.body.expectedReleaseId, 'current');
  assert.equal(post.body.practices, undefined);
});
