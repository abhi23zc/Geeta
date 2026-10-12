import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parsePractice } from '../shared/content.ts';
const require = createRequire(import.meta.url), ts = require('typescript');
const source=ts.transpileModule(readFileSync(new URL('../admin/src/practice-import.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
runInNewContext(source,{exports,require:()=>require('../shared/content.ts')});
const {importPractice,checkAudioFile}=exports;
const asset={id:'verified',url:'https://storage.googleapis.com/demo/verified',sha256:'a'.repeat(64),bytes:1041754,durationMs:54768,mimeType:'audio/mpeg'};
const teaching=JSON.parse(readFileSync(new URL('../admin/examples/gita-10-21.json',import.meta.url),'utf8'));
test('author JSON and verified upload preserve text and reviewed completion with old-client compatible closing cues',()=>{
  const input=JSON.stringify(teaching), p=importPractice(input,asset);
  assert.equal(p.sanskrit,teaching.sanskrit);assert.equal(p.id,'10-21');assert.equal(p.narration.asset.id,'verified');assert.equal(p.narration.completionMs,54730);
  assert.equal(p.narration.segments[6].kind,'intro');assert.equal(p.narration.segments[6].startMs,44350);assert.equal(p.narration.segments[6].text,teaching.narration.segments[6].text);
  assert.doesNotThrow(()=>parsePractice(p));assert.equal(JSON.stringify(teaching),input);
});
test('verified upload wins over placeholders; already published full metadata can be reused',()=>{
  assert.throws(()=>importPractice(JSON.stringify(teaching)),/Choose the narration/);
  const p=importPractice(JSON.stringify(teaching),asset);assert.equal(importPractice(JSON.stringify(p)).narration.asset.sha256,asset.sha256);
});
test('reject wrong recording duration, overlapping cues and malformed JSON',()=>{
  assert.throws(()=>importPractice(JSON.stringify(teaching),{...asset,durationMs:49000}),/matching audio/);
  const overlap=structuredClone(teaching);overlap.narration.segments[1].startMs=50;
  assert.throws(()=>importPractice(JSON.stringify(overlap),asset),/Overlapping/);
  assert.throws(()=>importPractice('{'),/valid JSON/);assert.throws(()=>importPractice('null'),/one complete teaching/);
});
test('audio preflight rejects unsupported and oversized files before upload',()=>{
  assert.doesNotThrow(()=>checkAudioFile({name:'WhatsApp Audio.mp3',size:1041754},'daily'));
  assert.throws(()=>checkAudioFile({name:'recording.wav',size:100},'daily'),/MP3 or M4A/);
  assert.throws(()=>checkAudioFile({name:'alarm.mp3',size:11*1024*1024},'alarm'),/10 MB/);
});
