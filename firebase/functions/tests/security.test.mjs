import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
test('Firebase rules isolate drafts and deny client publication', async () => {
  const env = await initializeTestEnvironment({ projectId:'demo-geeta', firestore:{ rules:await readFile('../firestore.rules','utf8'), host:'127.0.0.1', port:8080 }, storage:{ rules:await readFile('../storage.rules','utf8'), host:'127.0.0.1', port:9199 } });
  try {
    const ordinary=env.authenticatedContext('reader'), admin=env.authenticatedContext('editor',{admin:true});
    await assertFails(setDoc(doc(ordinary.firestore(),'drafts/reader'),{text:'test'}));
    await assertFails(getDoc(doc(ordinary.firestore(),'drafts/editor')));
    await assertSucceeds(setDoc(doc(admin.firestore(),'drafts/editor'),{text:'test'}));
    await assertFails(setDoc(doc(admin.firestore(),'delivery/current'),{releaseId:'unsafe'}));
    const bytes=new Uint8Array([1,2,3]);
    await assertFails(uploadBytes(ref(ordinary.storage(),'drafts/reader/a.mp3'),bytes,{contentType:'audio/mpeg'}));
    await assertSucceeds(uploadBytes(ref(admin.storage(),'drafts/editor/a.mp3'),bytes,{contentType:'audio/mpeg'}));
    await assertFails(getBytes(ref(ordinary.storage(),'drafts/editor/a.mp3')));
    await assertFails(uploadBytes(ref(admin.storage(),'published/a.audio'),bytes,{contentType:'audio/mpeg'}));
  } finally { await env.cleanup(); }
});
