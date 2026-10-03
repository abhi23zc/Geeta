import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { connectFirestoreEmulator, collection, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { connectStorageEmulator, getBlob, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { dateWindow, validDate, parsePractice, parseAlarm, type AudioAsset, type PublishedPractice, type AlarmTone } from '../../shared/content';
import './style.css';
const env = import.meta.env;
const configured = !!env.VITE_FIREBASE_PROJECT_ID;
const app = configured ? initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, appId: env.VITE_FIREBASE_APP_ID }) : null;
const auth = app ? getAuth(app) : null, db = app ? getFirestore(app) : null, storage = app ? getStorage(app) : null;
if (env.VITE_USE_EMULATORS === 'true' && auth && db && storage) { connectAuthEmulator(auth, 'http://localhost:9099'); connectFirestoreEmulator(db, 'localhost', 8080); connectStorageEmulator(storage, 'localhost', 9199); }
const blank = (id: string): PublishedPractice => ({ id, revision: crypto.randomUUID(), kind: 'gita', chapter: 1, verse: '1', theme: '', sanskrit: '', transliteration: '', meaning: '', takeaway: '', context: '', reflectionPrompt: '', words: [], narration: { asset: {} as AudioAsset, completionMs: 0, segments: [] } });
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function Admin() {
  const [user, setUser] = useState<User | null>(null), [authorized, setAuthorized] = useState(false), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const [start, setStart] = useState(localDate()), [selected, setSelected] = useState(0), [practices, setPractices] = useState<PublishedPractice[]>(Array.from({ length: 7 }, (_, i) => blank(`practice-${i+1}`)));
  const [alarms, setAlarms] = useState<AlarmTone[]>(['gita', 'shankh', 'pranayama'].map(key => ({ key: key as AlarmTone['key'], title: key, description: '', revision: crypto.randomUUID(), asset: {} as AudioAsset })));
  const [release, setRelease] = useState<string | null>(null), [releases, setReleases] = useState<string[]>([]), [enabled, setEnabled] = useState(true), [coverage, setCoverage] = useState<string[]>([]);
  const [text, setText] = useState(JSON.stringify(practices[0], null, 2)), [preview, setPreview] = useState(''), [position, setPosition] = useState(0);
  const player = useRef<HTMLAudioElement>(null);
  const unapplied = () => { try { return JSON.stringify(JSON.parse(text)) !== JSON.stringify(practices[selected]); } catch { return true; } };
  async function api(path: string, body: unknown) {
    if (!user) throw new Error('Sign in first');
    const response = await fetch(`/api/admin/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  }
  async function load() {
    if (!db) return;
    const current = (await getDoc(doc(db, 'delivery/current'))).data(); setRelease(current?.releaseId ?? null); setEnabled(current?.enabled !== false);
    const ids = (await getDocs(collection(db, 'releases'))).docs.map(d => ({ id: d.id, at: d.data().publishedAt })).sort((a,b) => String(b.at).localeCompare(String(a.at))); setReleases(ids.map(d => d.id));
    if (current?.releaseId) { const r = (await getDoc(doc(db, `releases/${current.releaseId}`))).data(); setCoverage(dateWindow(localDate(), 14).filter(date => !r?.schedule?.[date])); }
    else setCoverage(dateWindow(localDate(), 14));
  }
  useEffect(() => auth ? onAuthStateChanged(auth, current => { setUser(current); setAuthorized(false); if (current) void current.getIdTokenResult().then(token => { setAuthorized(token.claims.admin === true); if (token.claims.admin === true) void load().catch(error => setStatus(String(error))); }); }) : undefined, []);
  useEffect(() => { setText(JSON.stringify(practices[selected], null, 2)); }, [selected, practices]);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);
  async function action(fn: () => Promise<void>) { setBusy(true); setStatus('Working…'); try { await fn(); } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); } }
  async function upload(file: File, kind: 'daily' | 'alarm', index: number) {
    if (!storage || !user) return;
    const extension = file.name.toLowerCase().endsWith('.mp3') ? 'mp3' : 'm4a';
    const path = `drafts/${user.uid}/${crypto.randomUUID()}.${extension}`;
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4' });
    await new Promise<void>((resolve, reject) => task.on('state_changed', s => setStatus(`Uploading ${Math.round(s.bytesTransferred/s.totalBytes*100)}%`), reject, resolve));
    const asset = await api('validate-asset', { path, kind }) as AudioAsset;
    if (kind === 'daily') { setPractices(rows => rows.map((p,i) => i === index ? { ...p, revision: crypto.randomUUID(), narration: { ...p.narration, asset, completionMs: asset.durationMs } } : p)); setPreview(URL.createObjectURL(file)); }
    else { setAlarms(rows => rows.map((a,i) => i === index ? { ...a, revision: crypto.randomUUID(), asset } : a)); setPreview(URL.createObjectURL(file)); }
    setStatus('Audio verified. Review text and timings before publication.');
  }
  if (!configured) return <main><h1>Geeta admin setup</h1><p>Copy .env.example to .env.local and enter the Firebase web app configuration, then restart the admin server.</p></main>;
  if (!user) return <main><h1>Geeta content admin</h1><button onClick={() => void action(async () => { await signInWithPopup(auth!, new GoogleAuthProvider()); })}>Sign in with Google</button><p>{status}</p></main>;
  if (!authorized) return <main><h1>Admin access required</h1><p>Ask the project operator to assign the admin claim to {user.uid}, then sign in again.</p><button onClick={() => void signOut(auth!)}>Sign out</button></main>;
  return <main><header><h1>Geeta content studio</h1><button onClick={() => void signOut(auth!)}>Sign out</button></header><p role="status">{status}</p>
    <section><h2>Publication coverage</h2><p>{coverage.length ? `Unscheduled in next 14 days: ${coverage.join(', ')}` : 'Next 14 days are covered.'}</p><p>Current release: {release ?? 'None'}</p>
      <button disabled={busy} onClick={() => void action(async () => { await api('delivery', { enabled: !enabled }); await load(); setStatus(!enabled ? 'Refresh enabled' : 'Refresh paused; installed content remains playable'); })}>{enabled ? 'Pause app refresh' : 'Enable app refresh'}</button>
      <button disabled={busy} onClick={() => void action(async () => { await load(); setStatus('Publication state reloaded'); })}>Reload publication state</button>
      <select aria-label="Restore release" defaultValue="" disabled={busy} onChange={e => { const id = e.target.value; if (id && confirm('Restore this release as a new publication?')) void action(async () => { await api('restore', { restoreId: id, expectedReleaseId: release }); await load(); setStatus('Earlier release restored'); }); e.target.value = ''; }}><option value="">Restore an earlier release…</option>{releases.map(id => <option key={id}>{id}</option>)}</select>
    </section>
    <section><h2>Seven-day calendar</h2><label>First date<input type="date" value={start} onChange={e => { if(validDate(e.target.value)) setStart(e.target.value); }} /></label><nav>{dateWindow(start).map((date,i) => <button key={date} aria-pressed={selected === i} onClick={() => { if(i === selected || !unapplied() || confirm('Discard unapplied editor changes?')) setSelected(i); }}>{date}</button>)}</nav>
      <label>Upload narration<input type="file" accept=".mp3,.m4a" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if(f) void action(() => upload(f, 'daily', selected)); e.target.value=''; }} /></label>
      <label>Practice fields, glossary, and segment timings<textarea rows={24} value={text} onChange={e => setText(e.target.value)} spellCheck={false} /></label>
      <button disabled={busy} onClick={() => { try { const p = parsePractice(JSON.parse(text)); setPractices(rows => rows.map((v,i) => i === selected ? { ...p, revision: crypto.randomUUID() } : v)); setStatus('Practice validated and applied'); } catch(error) { setStatus(String(error)); } }}>Validate and apply edited practice</button>
      <p>Each segment needs kind, text, startMs, endMs. Intro, Sanskrit and meaning must follow the recording; timing overlaps are rejected.</p>
      <audio ref={player} controls src={preview || undefined} onTimeUpdate={() => setPosition(Math.round((player.current?.currentTime ?? 0)*1000))} /><p>Playback cursor: {position} ms</p>
      <label>Seek to milliseconds<input type="number" min="0" onChange={e => { if(player.current) player.current.currentTime = Number(e.target.value)/1000; }} /></label>
      <button onClick={() => void action(async () => { const url = practices[selected].narration.asset.url; if(!url) throw new Error('Upload audio first'); const path = decodeURIComponent(new URL(url).pathname.split('/').slice(2).join('/')); const blob = await getBlob(ref(storage!, path)); setPreview(URL.createObjectURL(blob)); setStatus('Preview ready'); })}>Preview uploaded draft audio</button>
      <button disabled={busy} onClick={() => void action(async () => { if(unapplied()) throw new Error('Apply current editor changes before saving the draft'); await setDoc(doc(db!, `drafts/${user.uid}`), { start, practices, alarms, updatedAt: new Date().toISOString() }); setStatus('Draft saved'); })}>Save draft</button>
      <button disabled={busy} onClick={() => void action(async () => { const draft = (await getDoc(doc(db!, `drafts/${user.uid}`))).data(); if(!draft) throw new Error('No saved draft'); setStart(draft.start); setPractices(draft.practices); setAlarms(draft.alarms); setSelected(0); setStatus('Draft loaded'); })}>Load draft</button>
    </section>
    <section><h2>Alarm music</h2>{alarms.map((alarm,i) => <div key={alarm.key}><h3>{alarm.key}</h3><label>Title<input value={alarm.title} onChange={e => setAlarms(rows => rows.map((a,j) => i===j ? { ...a, title: e.target.value } : a))} /></label><label>Description<input value={alarm.description} onChange={e => setAlarms(rows => rows.map((a,j) => i===j ? { ...a, description: e.target.value } : a))} /></label><input aria-label={`Upload ${alarm.key} alarm`} type="file" accept=".mp3,.m4a" disabled={busy} onChange={e => { const f=e.target.files?.[0]; if(f) void action(() => upload(f,'alarm',i)); e.target.value=''; }} /><p>{alarm.asset.sha256 ? `Verified · ${(alarm.asset.bytes/1048576).toFixed(1)} MB` : 'Audio required'}</p></div>)}</section>
    <section><h2>Review and publish</h2>{dateWindow(start).map((date,i) => <p key={date}>{date} · {practices[i].theme || 'Missing title'} · {practices[i].narration.segments.length} timed segments</p>)}<p>Apply text edits before publishing. Uploads and unsaved editor changes are not published automatically.</p>
      <button disabled={busy} onClick={() => void action(async () => { const validated = practices.map(parsePractice); const tones = alarms.map(parseAlarm); if(JSON.stringify(JSON.parse(text)) !== JSON.stringify(practices[selected])) throw new Error('Apply current editor changes before publishing'); await api('publish', { start, practices: validated, alarms: tones, expectedReleaseId: release }); await load(); setStatus('Seven days published successfully'); })}>Publish verified seven days</button>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Admin />);
